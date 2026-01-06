# DEX Swap Template Specification

## Overview

Full-featured DEX (Decentralized Exchange) with AMM (Automated Market Maker) using constant product formula (x * y = k). Includes token swapping, liquidity pools, portfolio tracking, and analytics.

**Difficulty:** Advanced
**Category:** DeFi
**Network:** Lumio Testnet

## Smart Contract

### Module: `swap::swap`

#### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `SWAP_FEE_BPS` | 30 | Swap fee (0.3% = 30 basis points) |
| `BPS_DENOMINATOR` | 10000 | Basis points divisor |
| `MINIMUM_LIQUIDITY` | 1000 | Minimum LP tokens (prevents attacks) |
| `MAX_U64` | 18446744073709551615 | Max u64 for overflow checks |

#### Data Structures

| Struct | Abilities | Fields | Description |
|--------|-----------|--------|-------------|
| `DEX` | `key` | `owner`, `total_pools`, `total_volume`, `total_fees_collected`, `is_paused` | Main DEX state |
| `Pool` | `key, store, copy, drop` | `id`, `token0_symbol`, `token1_symbol`, `reserve0`, `reserve1`, `total_lp_supply`, `volume_24h`, `fees_collected`, `created_at` | Liquidity pool |
| `PoolRegistry` | `key` | `pools: vector<Pool>` | All pools storage |
| `LPBalance` | `key` | `balances: vector<LPPosition>` | User LP positions |
| `LPPosition` | `store, copy, drop` | `pool_id`, `lp_tokens` | Single LP position |
| `TokenBalances` | `key` | `balances: vector<TokenBalance>` | User token holdings |
| `TokenBalance` | `store, copy, drop` | `symbol`, `amount` | Single token balance |

#### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NOT_INITIALIZED` | DEX or user not initialized |
| 2 | `E_ALREADY_INITIALIZED` | Already initialized |
| 3 | `E_POOL_EXISTS` | Pool for pair exists |
| 4 | `E_POOL_NOT_EXISTS` | Pool doesn't exist |
| 5 | `E_INSUFFICIENT_BALANCE` | Not enough tokens |
| 6 | `E_INSUFFICIENT_LIQUIDITY` | Not enough liquidity |
| 7 | `E_ZERO_AMOUNT` | Amount must be > 0 |
| 8 | `E_SLIPPAGE_EXCEEDED` | Output below minimum |
| 9 | `E_INVALID_POOL_ID` | Pool ID out of range |
| 10 | `E_NOT_OWNER` | Not DEX owner |
| 11 | `E_SAME_TOKEN` | Cannot create pool with same token |
| 12 | `E_OVERFLOW` | Math overflow |
| 13 | `E_PAUSED` | DEX is paused |

#### Entry Functions

**Initialization**
| Function | Parameters | Description |
|----------|------------|-------------|
| `initialize(account)` | Signer | Create DEX instance |
| `register(account)` | Signer | Register user for tokens/LP |

**Token Management**
| Function | Parameters | Description |
|----------|------------|-------------|
| `mint_tokens(account, symbol, amount)` | Signer, `vector<u8>`, `u64` | Mint test tokens (faucet) |

**Pool Management**
| Function | Parameters | Description |
|----------|------------|-------------|
| `create_pool(account, dex_addr, token0, token1, amount0, amount1)` | Signer, addr, symbols, amounts | Create new liquidity pool |
| `add_liquidity(account, dex_addr, pool_id, amount0, amount1, min0, min1)` | Signer, addr, id, amounts, mins | Add liquidity to pool |
| `remove_liquidity(account, dex_addr, pool_id, lp_amount, min0, min1)` | Signer, addr, id, lp, mins | Remove liquidity from pool |

**Trading**
| Function | Parameters | Description |
|----------|------------|-------------|
| `swap_exact_input(account, dex_addr, pool_id, amount_in, min_out, is_0_to_1)` | Signer, addr, id, amounts, direction | Swap tokens |

#### View Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `get_dex_info(dex_addr)` | `(u64, u64, u64, bool)` | pools, volume, fees, paused |
| `get_pool_info(dex_addr, pool_id)` | `(String, String, u64, u64, u64, u64, u64)` | symbols, reserves, lp, volume, fees |
| `get_pool_count(dex_addr)` | `u64` | Number of pools |
| `get_amount_out(dex_addr, pool_id, amount_in, direction)` | `u64` | Quote swap output |
| `get_token_balance(addr, symbol)` | `u64` | User token balance |
| `get_lp_balance(addr, pool_id)` | `u64` | User LP tokens |
| `is_initialized(addr)` | `bool` | Check DEX exists |
| `is_registered(addr)` | `bool` | Check user registered |

## AMM Formula

### Constant Product (x * y = k)

```
k = reserve0 * reserve1 (invariant)

Swap calculation:
amount_out = (amount_in * fee_factor * reserve_out) / (reserve_in * BPS + amount_in * fee_factor)

Where:
- fee_factor = BPS_DENOMINATOR - SWAP_FEE_BPS = 9970
- BPS = 10000
```

### Price Impact

```typescript
const priceImpact = (amountIn: bigint, reserveIn: bigint) => {
  return Number(amountIn * 100n / reserveIn); // percentage
}
```

### LP Token Calculation

```
Initial LP = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY

Additional LP = min(
  amount0 * total_lp / reserve0,
  amount1 * total_lp / reserve1
)
```

## Frontend Integration

### Hooks

```typescript
// useSwapContract.ts - DEX operations
const useSwapContract = () => {
  initialize(): Promise<void>
  register(): Promise<void>
  mintTokens(symbol: string, amount: bigint): Promise<void>
  createPool(token0: string, token1: string, amount0: bigint, amount1: bigint): Promise<void>
  addLiquidity(poolId: number, amount0: bigint, amount1: bigint, min0: bigint, min1: bigint): Promise<void>
  removeLiquidity(poolId: number, lpAmount: bigint, min0: bigint, min1: bigint): Promise<void>
  swap(poolId: number, amountIn: bigint, minOut: bigint, isToken0ToToken1: boolean): Promise<void>
  getAmountOut(poolId: number, amountIn: bigint, isToken0ToToken1: boolean): Promise<bigint>
  getPoolInfo(poolId: number): Promise<PoolInfo>
  getDexInfo(): Promise<DexInfo>
}

// usePools.ts - Pool data
const usePools = () => {
  pools: Pool[]
  loading: boolean
  refetch(): void
}

// usePortfolio.ts - User holdings
const usePortfolio = () => {
  balances: TokenBalance[]
  lpPositions: LPPosition[]
  totalValue: number
}

// useAnalytics.ts - Trading analytics
const useAnalytics = () => {
  volume24h: bigint
  totalVolume: bigint
  feesCollected: bigint
  poolCount: number
}
```

### Types

```typescript
interface PoolInfo {
  id: number
  token0Symbol: string
  token1Symbol: string
  reserve0: bigint
  reserve1: bigint
  totalLpSupply: bigint
  volume24h: bigint
  feesCollected: bigint
}

interface DexInfo {
  totalPools: number
  totalVolume: bigint
  totalFees: bigint
  isPaused: boolean
}

interface TokenBalance {
  symbol: string
  amount: bigint
}

interface LPPosition {
  poolId: number
  lpTokens: bigint
  value: bigint // USD value
}
```

### Pages

| Page | Description |
|------|-------------|
| **Index (Swap)** | Main swap interface with token selection |
| **Pools** | Pool list, add/remove liquidity |
| **Portfolio** | User balances and LP positions |
| **Analytics** | DEX statistics and charts |

### Components

| Component | Description |
|-----------|-------------|
| `SwapCard` | Token input, swap button, quotes |
| `TokenSelector` | Token dropdown with search |
| `PoolCard` | Single pool display with APY |
| `PoolsTable` | All pools with filtering |
| `AddLiquidityModal` | Add liquidity form |
| `RemoveLiquidityModal` | Remove liquidity form |
| `PriceChart` | Token price history |
| `MyPositions` | User LP positions |
| `RecentTrades` | Transaction history |
| `WalletConnectModal` | Pontem wallet connection |

## User Flows

### 1. Initialize DEX (Admin)
```
Connect Wallet → Deploy DEX → DEX Ready
```

### 2. Register User
```
Connect Wallet → Click "Register" → Sign → Can trade/provide liquidity
```

### 3. Get Test Tokens (Faucet)
```
Registered → Select token → Enter amount → Mint → Tokens in wallet
```

### 4. Create Pool
```
Have 2 tokens → Select pair → Enter amounts → Create Pool → Pool created, receive LP tokens
```

### 5. Add Liquidity
```
Pool exists → Select pool → Enter amounts → Add Liquidity → Receive LP tokens
```

### 6. Remove Liquidity
```
Have LP tokens → Select pool → Enter LP amount → Remove → Receive underlying tokens
```

### 7. Swap Tokens
```
Have tokens → Select input/output → Enter amount → Review quote → Swap → Receive output tokens
```

## CLI Commands

```bash
# Initialize DEX
lumio move run --function-id '<deployer>::swap::initialize'

# Register user
lumio move run --function-id '<deployer>::swap::register'

# Mint test tokens
lumio move run --function-id '<deployer>::swap::mint_tokens' \
  --args 'string:USDC' 'u64:1000000000000'

# Create pool (USDC/ETH)
lumio move run --function-id '<deployer>::swap::create_pool' \
  --args 'address:<dex_addr>' 'string:USDC' 'string:ETH' 'u64:10000000000' 'u64:5000000000'

# Add liquidity
lumio move run --function-id '<deployer>::swap::add_liquidity' \
  --args 'address:<dex_addr>' 'u64:0' 'u64:1000000000' 'u64:500000000' 'u64:900000000' 'u64:450000000'

# Remove liquidity
lumio move run --function-id '<deployer>::swap::remove_liquidity' \
  --args 'address:<dex_addr>' 'u64:0' 'u64:100000000' 'u64:0' 'u64:0'

# Swap (USDC → ETH)
lumio move run --function-id '<deployer>::swap::swap_exact_input' \
  --args 'address:<dex_addr>' 'u64:0' 'u64:100000000' 'u64:45000000' 'bool:true'

# Get swap quote
lumio move view --function-id '<deployer>::swap::get_amount_out' \
  --args 'address:<dex_addr>' 'u64:0' 'u64:100000000' 'bool:true'

# Get DEX info
lumio move view --function-id '<deployer>::swap::get_dex_info' \
  --args 'address:<dex_addr>'

# Get pool info
lumio move view --function-id '<deployer>::swap::get_pool_info' \
  --args 'address:<dex_addr>' 'u64:0'

# Get user token balance
lumio move view --function-id '<deployer>::swap::get_token_balance' \
  --args 'address:<user_addr>' 'string:USDC'

# Get user LP balance
lumio move view --function-id '<deployer>::swap::get_lp_balance' \
  --args 'address:<user_addr>' 'u64:0'
```

## Environment Variables

```env
VITE_NETWORK=testnet
VITE_API_URL=https://api.testnet.lumio.io/v1
```

## Calculations Reference

### Slippage Protection

```typescript
const calculateMinOutput = (expectedOutput: bigint, slippagePercent: number) => {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return expectedOutput * (10000n - slippageBps) / 10000n;
}
```

### Pool Share

```typescript
const calculatePoolShare = (userLp: bigint, totalLp: bigint) => {
  return Number(userLp * 10000n / totalLp) / 100; // percentage
}
```

### Impermanent Loss

```typescript
const calculateIL = (priceRatio: number) => {
  // IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  return 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
}
```

## Testing Checklist

- [ ] Deploy DEX contract
- [ ] Initialize DEX
- [ ] Register multiple users
- [ ] Mint various test tokens
- [ ] Create pool with two tokens
- [ ] Verify LP tokens minted correctly
- [ ] Add liquidity to existing pool
- [ ] Remove partial liquidity
- [ ] Remove all liquidity
- [ ] Swap token0 → token1
- [ ] Swap token1 → token0
- [ ] Verify fees collected
- [ ] Verify volume tracking
- [ ] Test slippage protection
- [ ] Test duplicate pool creation (should fail)
- [ ] Test same token pool (should fail)
- [ ] Test zero amount operations (should fail)
- [ ] Test insufficient balance (should fail)
- [ ] Create multiple pools
- [ ] Large swap impact test
- [ ] Overflow protection test
