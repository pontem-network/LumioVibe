/// AMM DEX Module - Constant Product Market Maker (x * y = k)
/// Supports creating pools, adding/removing liquidity, and swapping tokens
module __PROJECT_NAME__::swap {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_POOL_EXISTS: u64 = 3;
    const E_POOL_NOT_EXISTS: u64 = 4;
    const E_INSUFFICIENT_BALANCE: u64 = 5;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 6;
    const E_ZERO_AMOUNT: u64 = 7;
    const E_SLIPPAGE_EXCEEDED: u64 = 8;
    const E_INVALID_POOL_ID: u64 = 9;
    const E_NOT_OWNER: u64 = 10;
    const E_SAME_TOKEN: u64 = 11;
    const E_OVERFLOW: u64 = 12;
    const E_PAUSED: u64 = 13;

    // Fee in basis points (30 = 0.3%)
    const SWAP_FEE_BPS: u64 = 30;
    const BPS_DENOMINATOR: u64 = 10000;

    // Minimum liquidity to prevent division by zero attacks
    const MINIMUM_LIQUIDITY: u64 = 1000;

    // Max u64 for overflow checks
    const MAX_U64: u64 = 18446744073709551615;

    /// Main DEX state stored at deployer address
    struct DEX has key {
        owner: address,
        total_pools: u64,
        total_volume: u64,
        total_fees_collected: u64,
        is_paused: bool,
    }

    /// Liquidity pool for a token pair
    struct Pool has key, store, copy, drop {
        id: u64,
        token0_symbol: String,
        token1_symbol: String,
        reserve0: u64,
        reserve1: u64,
        total_lp_supply: u64,
        volume_24h: u64,
        fees_collected: u64,
        created_at: u64,
    }

    /// Pool registry - stores all pools
    struct PoolRegistry has key {
        pools: vector<Pool>,
    }

    /// LP token balance for liquidity providers
    struct LPBalance has key {
        balances: vector<LPPosition>,
    }

    /// Individual LP position in a pool
    struct LPPosition has store, copy, drop {
        pool_id: u64,
        lp_tokens: u64,
    }

    /// User token balances (simplified for demo)
    struct TokenBalances has key {
        balances: vector<TokenBalance>,
    }

    struct TokenBalance has store, copy, drop {
        symbol: String,
        amount: u64,
    }

    // ==================== Initialization ====================

    /// Initialize the DEX
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<DEX>(addr), E_ALREADY_INITIALIZED);

        move_to(account, DEX {
            owner: addr,
            total_pools: 0,
            total_volume: 0,
            total_fees_collected: 0,
            is_paused: false,
        });

        move_to(account, PoolRegistry {
            pools: vector::empty(),
        });
    }

    /// Register user for token balances and LP positions
    public entry fun register(account: &signer) {
        let addr = signer::address_of(account);

        if (!exists<TokenBalances>(addr)) {
            move_to(account, TokenBalances {
                balances: vector::empty(),
            });
        };

        if (!exists<LPBalance>(addr)) {
            move_to(account, LPBalance {
                balances: vector::empty(),
            });
        };
    }

    // ==================== Token Management ====================

    /// Mint tokens to user (for testing/faucet)
    public entry fun mint_tokens(
        account: &signer,
        symbol: vector<u8>,
        amount: u64
    ) acquires TokenBalances {
        let addr = signer::address_of(account);
        assert!(exists<TokenBalances>(addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let balances = borrow_global_mut<TokenBalances>(addr);
        let symbol_str = string::utf8(symbol);

        let i = 0;
        let len = vector::length(&balances.balances);
        let found = false;

        while (i < len) {
            let balance = vector::borrow_mut(&mut balances.balances, i);
            if (balance.symbol == symbol_str) {
                balance.amount = balance.amount + amount;
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            vector::push_back(&mut balances.balances, TokenBalance {
                symbol: symbol_str,
                amount,
            });
        };
    }

    // ==================== Pool Management ====================

    /// Create a new liquidity pool
    public entry fun create_pool(
        account: &signer,
        dex_addr: address,
        token0_symbol: vector<u8>,
        token1_symbol: vector<u8>,
        initial_amount0: u64,
        initial_amount1: u64
    ) acquires DEX, PoolRegistry, TokenBalances, LPBalance {
        let addr = signer::address_of(account);
        assert!(exists<DEX>(dex_addr), E_NOT_INITIALIZED);
        assert_not_paused(dex_addr);
        assert!(initial_amount0 > 0 && initial_amount1 > 0, E_ZERO_AMOUNT);

        let token0 = string::utf8(token0_symbol);
        let token1 = string::utf8(token1_symbol);
        assert!(token0 != token1, E_SAME_TOKEN);

        let registry = borrow_global_mut<PoolRegistry>(dex_addr);

        // Check pool doesn't exist
        let i = 0;
        let len = vector::length(&registry.pools);
        while (i < len) {
            let pool = vector::borrow(&registry.pools, i);
            let exists_pair = (pool.token0_symbol == token0 && pool.token1_symbol == token1) ||
                             (pool.token0_symbol == token1 && pool.token1_symbol == token0);
            assert!(!exists_pair, E_POOL_EXISTS);
            i = i + 1;
        };

        // Transfer tokens from user
        deduct_token_balance(addr, token0, initial_amount0);
        deduct_token_balance(addr, token1, initial_amount1);

        let dex = borrow_global_mut<DEX>(dex_addr);
        let pool_id = dex.total_pools;
        dex.total_pools = dex.total_pools + 1;

        // Calculate initial LP tokens (geometric mean minus minimum liquidity)
        // Use sqrt_product to avoid overflow
        let initial_lp = sqrt_product(initial_amount0, initial_amount1);
        assert!(initial_lp > MINIMUM_LIQUIDITY, E_INSUFFICIENT_LIQUIDITY);
        let user_lp = initial_lp - MINIMUM_LIQUIDITY;

        let pool = Pool {
            id: pool_id,
            token0_symbol: token0,
            token1_symbol: token1,
            reserve0: initial_amount0,
            reserve1: initial_amount1,
            total_lp_supply: initial_lp,
            volume_24h: 0,
            fees_collected: 0,
            created_at: 0, // Would use timestamp in production
        };

        vector::push_back(&mut registry.pools, pool);

        // Mint LP tokens to user
        add_lp_balance(addr, pool_id, user_lp);
    }

    /// Add liquidity to existing pool
    public entry fun add_liquidity(
        account: &signer,
        dex_addr: address,
        pool_id: u64,
        amount0_desired: u64,
        amount1_desired: u64,
        amount0_min: u64,
        amount1_min: u64
    ) acquires DEX, PoolRegistry, TokenBalances, LPBalance {
        let addr = signer::address_of(account);
        assert!(exists<DEX>(dex_addr), E_NOT_INITIALIZED);
        assert_not_paused(dex_addr);

        let registry = borrow_global_mut<PoolRegistry>(dex_addr);
        assert!(pool_id < vector::length(&registry.pools), E_INVALID_POOL_ID);

        let pool = vector::borrow_mut(&mut registry.pools, pool_id);

        // Calculate optimal amounts (using safe math to avoid overflow)
        let (amount0, amount1) = if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            (amount0_desired, amount1_desired)
        } else {
            let amount1_optimal = mul_div(amount0_desired, pool.reserve1, pool.reserve0);
            if (amount1_optimal <= amount1_desired) {
                assert!(amount1_optimal >= amount1_min, E_SLIPPAGE_EXCEEDED);
                (amount0_desired, amount1_optimal)
            } else {
                let amount0_optimal = mul_div(amount1_desired, pool.reserve0, pool.reserve1);
                assert!(amount0_optimal <= amount0_desired, E_SLIPPAGE_EXCEEDED);
                assert!(amount0_optimal >= amount0_min, E_SLIPPAGE_EXCEEDED);
                (amount0_optimal, amount1_desired)
            }
        };

        // Transfer tokens
        deduct_token_balance(addr, pool.token0_symbol, amount0);
        deduct_token_balance(addr, pool.token1_symbol, amount1);

        // Calculate LP tokens to mint (using safe math to avoid overflow)
        let lp_tokens = if (pool.total_lp_supply == 0) {
            sqrt_product(amount0, amount1)
        } else {
            let lp0 = mul_div(amount0, pool.total_lp_supply, pool.reserve0);
            let lp1 = mul_div(amount1, pool.total_lp_supply, pool.reserve1);
            if (lp0 < lp1) { lp0 } else { lp1 }
        };

        assert!(lp_tokens > 0, E_INSUFFICIENT_LIQUIDITY);

        // Update pool
        pool.reserve0 = pool.reserve0 + amount0;
        pool.reserve1 = pool.reserve1 + amount1;
        pool.total_lp_supply = pool.total_lp_supply + lp_tokens;

        // Mint LP tokens to user
        add_lp_balance(addr, pool_id, lp_tokens);
    }

    /// Remove liquidity from pool
    public entry fun remove_liquidity(
        account: &signer,
        dex_addr: address,
        pool_id: u64,
        lp_amount: u64,
        amount0_min: u64,
        amount1_min: u64
    ) acquires DEX, PoolRegistry, TokenBalances, LPBalance {
        let addr = signer::address_of(account);
        assert!(exists<DEX>(dex_addr), E_NOT_INITIALIZED);
        assert_not_paused(dex_addr);
        assert!(lp_amount > 0, E_ZERO_AMOUNT);

        let registry = borrow_global_mut<PoolRegistry>(dex_addr);
        assert!(pool_id < vector::length(&registry.pools), E_INVALID_POOL_ID);

        let pool = vector::borrow_mut(&mut registry.pools, pool_id);

        // Calculate amounts to return (using safe math to avoid overflow)
        let amount0 = mul_div(lp_amount, pool.reserve0, pool.total_lp_supply);
        let amount1 = mul_div(lp_amount, pool.reserve1, pool.total_lp_supply);

        assert!(amount0 >= amount0_min, E_SLIPPAGE_EXCEEDED);
        assert!(amount1 >= amount1_min, E_SLIPPAGE_EXCEEDED);

        // Burn LP tokens
        deduct_lp_balance(addr, pool_id, lp_amount);

        // Update pool
        pool.reserve0 = pool.reserve0 - amount0;
        pool.reserve1 = pool.reserve1 - amount1;
        pool.total_lp_supply = pool.total_lp_supply - lp_amount;

        // Return tokens to user
        add_token_balance(addr, pool.token0_symbol, amount0);
        add_token_balance(addr, pool.token1_symbol, amount1);
    }

    // ==================== Swap ====================

    /// Swap exact input amount for output
    public entry fun swap_exact_input(
        account: &signer,
        dex_addr: address,
        pool_id: u64,
        amount_in: u64,
        min_amount_out: u64,
        is_token0_to_token1: bool
    ) acquires DEX, PoolRegistry, TokenBalances {
        let addr = signer::address_of(account);
        assert!(exists<DEX>(dex_addr), E_NOT_INITIALIZED);
        assert_not_paused(dex_addr);
        assert!(amount_in > 0, E_ZERO_AMOUNT);

        let registry = borrow_global_mut<PoolRegistry>(dex_addr);
        assert!(pool_id < vector::length(&registry.pools), E_INVALID_POOL_ID);

        let pool = vector::borrow_mut(&mut registry.pools, pool_id);

        let (reserve_in, reserve_out, token_in, token_out) = if (is_token0_to_token1) {
            (pool.reserve0, pool.reserve1, pool.token0_symbol, pool.token1_symbol)
        } else {
            (pool.reserve1, pool.reserve0, pool.token1_symbol, pool.token0_symbol)
        };

        // Calculate output amount using constant product formula (using u128 to avoid overflow)
        // amount_out = (amount_in * fee_factor * reserve_out) / (reserve_in * BPS + amount_in * fee_factor)
        let amount_in_with_fee = (amount_in as u128) * ((BPS_DENOMINATOR - SWAP_FEE_BPS) as u128);
        let numerator = amount_in_with_fee * (reserve_out as u128);
        let denominator = ((reserve_in as u128) * (BPS_DENOMINATOR as u128)) + amount_in_with_fee;
        let amount_out = ((numerator / denominator) as u64);

        assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);
        assert!(amount_out < reserve_out, E_INSUFFICIENT_LIQUIDITY);

        // Transfer tokens
        deduct_token_balance(addr, token_in, amount_in);
        add_token_balance(addr, token_out, amount_out);

        // Update reserves
        if (is_token0_to_token1) {
            pool.reserve0 = pool.reserve0 + amount_in;
            pool.reserve1 = pool.reserve1 - amount_out;
        } else {
            pool.reserve1 = pool.reserve1 + amount_in;
            pool.reserve0 = pool.reserve0 - amount_out;
        };

        // Update stats
        let fee = (amount_in * SWAP_FEE_BPS) / BPS_DENOMINATOR;
        pool.fees_collected = pool.fees_collected + fee;
        pool.volume_24h = pool.volume_24h + amount_in;

        let dex = borrow_global_mut<DEX>(dex_addr);
        dex.total_volume = dex.total_volume + amount_in;
        dex.total_fees_collected = dex.total_fees_collected + fee;
    }

    /// Get output amount for a given input (quote)
    #[view]
    public fun get_amount_out(
        dex_addr: address,
        pool_id: u64,
        amount_in: u64,
        is_token0_to_token1: bool
    ): u64 acquires PoolRegistry {
        if (!exists<PoolRegistry>(dex_addr)) {
            return 0
        };

        let registry = borrow_global<PoolRegistry>(dex_addr);
        if (pool_id >= vector::length(&registry.pools)) {
            return 0
        };

        let pool = vector::borrow(&registry.pools, pool_id);

        let (reserve_in, reserve_out) = if (is_token0_to_token1) {
            (pool.reserve0, pool.reserve1)
        } else {
            (pool.reserve1, pool.reserve0)
        };

        if (reserve_in == 0 || reserve_out == 0) {
            return 0
        };

        // Use u128 to avoid overflow in calculations
        let amount_in_with_fee = (amount_in as u128) * ((BPS_DENOMINATOR - SWAP_FEE_BPS) as u128);
        let numerator = amount_in_with_fee * (reserve_out as u128);
        let denominator = ((reserve_in as u128) * (BPS_DENOMINATOR as u128)) + amount_in_with_fee;

        ((numerator / denominator) as u64)
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_dex_info(dex_addr: address): (u64, u64, u64, bool) acquires DEX {
        if (!exists<DEX>(dex_addr)) {
            return (0, 0, 0, true)
        };
        let dex = borrow_global<DEX>(dex_addr);
        (dex.total_pools, dex.total_volume, dex.total_fees_collected, dex.is_paused)
    }

    #[view]
    public fun get_pool_info(dex_addr: address, pool_id: u64): (String, String, u64, u64, u64, u64, u64) acquires PoolRegistry {
        assert!(exists<PoolRegistry>(dex_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<PoolRegistry>(dex_addr);
        assert!(pool_id < vector::length(&registry.pools), E_INVALID_POOL_ID);

        let pool = vector::borrow(&registry.pools, pool_id);
        (
            pool.token0_symbol,
            pool.token1_symbol,
            pool.reserve0,
            pool.reserve1,
            pool.total_lp_supply,
            pool.volume_24h,
            pool.fees_collected
        )
    }

    #[view]
    public fun get_pool_count(dex_addr: address): u64 acquires DEX {
        if (!exists<DEX>(dex_addr)) {
            return 0
        };
        borrow_global<DEX>(dex_addr).total_pools
    }

    #[view]
    public fun get_token_balance(addr: address, symbol: vector<u8>): u64 acquires TokenBalances {
        if (!exists<TokenBalances>(addr)) {
            return 0
        };

        let balances = borrow_global<TokenBalances>(addr);
        let symbol_str = string::utf8(symbol);

        let i = 0;
        let len = vector::length(&balances.balances);
        while (i < len) {
            let balance = vector::borrow(&balances.balances, i);
            if (balance.symbol == symbol_str) {
                return balance.amount
            };
            i = i + 1;
        };

        0
    }

    #[view]
    public fun get_lp_balance(addr: address, pool_id: u64): u64 acquires LPBalance {
        if (!exists<LPBalance>(addr)) {
            return 0
        };

        let lp_balances = borrow_global<LPBalance>(addr);

        let i = 0;
        let len = vector::length(&lp_balances.balances);
        while (i < len) {
            let pos = vector::borrow(&lp_balances.balances, i);
            if (pos.pool_id == pool_id) {
                return pos.lp_tokens
            };
            i = i + 1;
        };

        0
    }

    #[view]
    public fun is_initialized(addr: address): bool {
        exists<DEX>(addr)
    }

    #[view]
    public fun is_registered(addr: address): bool {
        exists<TokenBalances>(addr)
    }

    // ==================== Internal Functions ====================

    /// Check if DEX is paused (aborts if paused)
    fun assert_not_paused(dex_addr: address) acquires DEX {
        let dex = borrow_global<DEX>(dex_addr);
        assert!(!dex.is_paused, E_PAUSED);
    }

    fun deduct_token_balance(addr: address, symbol: String, amount: u64) acquires TokenBalances {
        let balances = borrow_global_mut<TokenBalances>(addr);

        let i = 0;
        let len = vector::length(&balances.balances);
        while (i < len) {
            let balance = vector::borrow_mut(&mut balances.balances, i);
            if (balance.symbol == symbol) {
                assert!(balance.amount >= amount, E_INSUFFICIENT_BALANCE);
                balance.amount = balance.amount - amount;
                return
            };
            i = i + 1;
        };

        abort E_INSUFFICIENT_BALANCE
    }

    fun add_token_balance(addr: address, symbol: String, amount: u64) acquires TokenBalances {
        let balances = borrow_global_mut<TokenBalances>(addr);

        let i = 0;
        let len = vector::length(&balances.balances);
        while (i < len) {
            let balance = vector::borrow_mut(&mut balances.balances, i);
            if (balance.symbol == symbol) {
                balance.amount = balance.amount + amount;
                return
            };
            i = i + 1;
        };

        vector::push_back(&mut balances.balances, TokenBalance {
            symbol,
            amount,
        });
    }

    fun add_lp_balance(addr: address, pool_id: u64, amount: u64) acquires LPBalance {
        let lp_balances = borrow_global_mut<LPBalance>(addr);

        let i = 0;
        let len = vector::length(&lp_balances.balances);
        while (i < len) {
            let pos = vector::borrow_mut(&mut lp_balances.balances, i);
            if (pos.pool_id == pool_id) {
                pos.lp_tokens = pos.lp_tokens + amount;
                return
            };
            i = i + 1;
        };

        vector::push_back(&mut lp_balances.balances, LPPosition {
            pool_id,
            lp_tokens: amount,
        });
    }

    fun deduct_lp_balance(addr: address, pool_id: u64, amount: u64) acquires LPBalance {
        let lp_balances = borrow_global_mut<LPBalance>(addr);

        let i = 0;
        let len = vector::length(&lp_balances.balances);
        while (i < len) {
            let pos = vector::borrow_mut(&mut lp_balances.balances, i);
            if (pos.pool_id == pool_id) {
                assert!(pos.lp_tokens >= amount, E_INSUFFICIENT_BALANCE);
                pos.lp_tokens = pos.lp_tokens - amount;
                return
            };
            i = i + 1;
        };

        abort E_INSUFFICIENT_BALANCE
    }

    /// Integer square root (Babylonian method)
    fun sqrt(x: u64): u64 {
        if (x == 0) {
            return 0
        };

        let z = (x + 1) / 2;
        let y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        };

        y
    }

    /// Safe sqrt of product using u128 to avoid overflow
    fun sqrt_product(a: u64, b: u64): u64 {
        let product = (a as u128) * (b as u128);
        let result = sqrt_u128(product);
        (result as u64)
    }

    /// Integer square root for u128 (Babylonian method)
    fun sqrt_u128(x: u128): u128 {
        if (x == 0) {
            return 0
        };

        let z = (x + 1) / 2;
        let y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        };

        y
    }

    /// Safe multiply and divide to avoid overflow: (a * b) / c using u128
    fun mul_div(a: u64, b: u64, c: u64): u64 {
        assert!(c > 0, E_ZERO_AMOUNT);
        let result = ((a as u128) * (b as u128)) / (c as u128);
        assert!(result <= (MAX_U64 as u128), E_OVERFLOW);
        (result as u64)
    }
}
