module token::token {
    use std::signer;
    use std::string::{Self, String};

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_ZERO_AMOUNT: u64 = 4;
    const E_NOT_OWNER: u64 = 5;

    struct TokenInfo has key {
        name: String,
        symbol: String,
        decimals: u8,
        total_supply: u64,
        owner: address,
    }

    struct Balance has key {
        value: u64,
    }

    public entry fun initialize(
        account: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8
    ) {
        let addr = signer::address_of(account);
        assert!(!exists<TokenInfo>(addr), E_ALREADY_INITIALIZED);

        move_to(account, TokenInfo {
            name: string::utf8(name),
            symbol: string::utf8(symbol),
            decimals,
            total_supply: 0,
            owner: addr,
        });

        move_to(account, Balance { value: 0 });
    }

    public entry fun register(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<Balance>(addr)) {
            move_to(account, Balance { value: 0 });
        };
    }

    public entry fun mint(
        account: &signer,
        to: address,
        amount: u64
    ) acquires TokenInfo, Balance {
        let addr = signer::address_of(account);
        assert!(exists<TokenInfo>(addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let token_info = borrow_global_mut<TokenInfo>(addr);
        assert!(token_info.owner == addr, E_NOT_OWNER);

        token_info.total_supply = token_info.total_supply + amount;

        assert!(exists<Balance>(to), E_NOT_INITIALIZED);
        let to_balance = borrow_global_mut<Balance>(to);
        to_balance.value = to_balance.value + amount;
    }

    public entry fun burn(account: &signer, amount: u64) acquires TokenInfo, Balance {
        let addr = signer::address_of(account);
        assert!(exists<Balance>(addr), E_NOT_INITIALIZED);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let balance = borrow_global_mut<Balance>(addr);
        assert!(balance.value >= amount, E_INSUFFICIENT_BALANCE);
        balance.value = balance.value - amount;

        if (exists<TokenInfo>(addr)) {
            let token_info = borrow_global_mut<TokenInfo>(addr);
            if (token_info.total_supply >= amount) {
                token_info.total_supply = token_info.total_supply - amount;
            };
        };
    }

    public entry fun transfer(
        from: &signer,
        to: address,
        amount: u64
    ) acquires Balance {
        let from_addr = signer::address_of(from);
        assert!(exists<Balance>(from_addr), E_NOT_INITIALIZED);
        assert!(exists<Balance>(to), E_NOT_INITIALIZED);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let from_balance = borrow_global_mut<Balance>(from_addr);
        assert!(from_balance.value >= amount, E_INSUFFICIENT_BALANCE);
        from_balance.value = from_balance.value - amount;

        let to_balance = borrow_global_mut<Balance>(to);
        to_balance.value = to_balance.value + amount;
    }

    #[view]
    public fun get_balance(addr: address): u64 acquires Balance {
        if (!exists<Balance>(addr)) {
            return 0
        };
        borrow_global<Balance>(addr).value
    }

    #[view]
    public fun get_total_supply(token_addr: address): u64 acquires TokenInfo {
        if (!exists<TokenInfo>(token_addr)) {
            return 0
        };
        borrow_global<TokenInfo>(token_addr).total_supply
    }

    #[view]
    public fun get_token_info(token_addr: address): (String, String, u8, u64) acquires TokenInfo {
        assert!(exists<TokenInfo>(token_addr), E_NOT_INITIALIZED);
        let info = borrow_global<TokenInfo>(token_addr);
        (info.name, info.symbol, info.decimals, info.total_supply)
    }

    #[view]
    public fun is_initialized(addr: address): bool {
        exists<TokenInfo>(addr)
    }

    #[view]
    public fun is_registered(addr: address): bool {
        exists<Balance>(addr)
    }
}
