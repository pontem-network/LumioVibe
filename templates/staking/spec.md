# Staking Pool Template Specification

## Overview

Stake tokens to earn rewards over time. Learn DeFi staking mechanics, reward calculations, and pool management on Lumio Network.

**Difficulty:** Intermediate
**Category:** DeFi
**Network:** Lumio Testnet

## Smart Contract

### Module: `staking::staking`

#### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `REWARD_RATE_PERCENT` | 10 | Reward rate (10% of staked amount) |

#### Data Structures

| Struct | Abilities | Fields | Description |
|--------|-----------|--------|-------------|
| `StakingPool` | `key` | `total_staked: u64`, `reward_pool: u64`, `is_active: bool` | Pool state and reserves |
| `UserStake` | `key` | `staked_amount: u64`, `rewards_earned: u64` | User's staking position |

#### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NOT_INITIALIZED` | User not initialized |
| 2 | `E_ALREADY_INITIALIZED` | Already initialized |
| 3 | `E_INSUFFICIENT_BALANCE` | Not enough staked |
| 4 | `E_NO_STAKE` | User has no stake |
| 5 | `E_POOL_NOT_INITIALIZED` | Pool doesn't exist |
| 6 | `E_POOL_ALREADY_INITIALIZED` | Pool already created |
| 7 | `E_ZERO_AMOUNT` | Amount must be > 0 |
| 8 | `E_NO_REWARDS` | No rewards to claim |

#### Entry Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `initialize_pool(account, initial_rewards)` | Signer, `u64` | Create staking pool with reward reserve |
| `stake(account, pool_address, amount)` | Signer, `address`, `u64` | Stake tokens in pool |
| `unstake(account, pool_address, amount)` | Signer, `address`, `u64` | Withdraw staked tokens |
| `claim_rewards(account)` | Signer | Claim earned rewards |
| `add_rewards(account, amount)` | Signer (pool owner), `u64` | Add rewards to pool |

#### View Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_pool_info(pool_address)` | `address` | `(u64, u64, bool)` | total_staked, reward_pool, is_active |
| `get_user_stake(user_address)` | `address` | `(u64, u64)` | staked_amount, rewards_earned |
| `get_staked_amount(user_address)` | `address` | `u64` | User's staked tokens |
| `get_pending_rewards(user_address)` | `address` | `u64` | Unclaimed rewards |
| `pool_exists(pool_address)` | `address` | `bool` | Check if pool exists |
| `user_stake_exists(user_address)` | `address` | `bool` | Check if user has stake |

## Reward Mechanics

```
reward = (staked_amount * REWARD_RATE_PERCENT) / 100

Example:
- Stake 1000 tokens
- Reward rate: 10%
- Immediate reward: 100 tokens (if pool has sufficient rewards)
```

## Frontend Integration

### Hooks

```typescript
// useContract.ts - Staking operations
const useContract = () => {
  initializePool(initialRewards: bigint): Promise<void>
  stake(poolAddress: string, amount: bigint): Promise<void>
  unstake(poolAddress: string, amount: bigint): Promise<void>
  claimRewards(): Promise<void>
  addRewards(amount: bigint): Promise<void>
  getPoolInfo(poolAddress: string): Promise<PoolInfo>
  getUserStake(userAddress: string): Promise<UserStake>
  getPendingRewards(userAddress: string): Promise<bigint>
}

interface PoolInfo {
  totalStaked: bigint
  rewardPool: bigint
  isActive: boolean
}

interface UserStake {
  stakedAmount: bigint
  rewardsEarned: bigint
}
```

### Pages

- **Home** - Staking dashboard with pool stats, stake/unstake interface

### Features

- Pool statistics (TVL, reward pool, APY)
- Stake tokens
- Unstake tokens
- Claim rewards
- User position display
- Real-time reward tracking

## User Flows

### 1. Create Staking Pool (Admin)
```
Connect Wallet → Enter initial reward amount → Click "Create Pool" → Sign → Pool Created
```

### 2. Stake Tokens
```
Connected → Enter stake amount → Click "Stake" → Sign → Tokens staked, rewards calculated
```

### 3. Unstake Tokens
```
Has stake → Enter unstake amount → Click "Unstake" → Sign → Tokens returned
```

### 4. Claim Rewards
```
Has rewards → Click "Claim Rewards" → Sign → Rewards transferred, balance reset
```

### 5. Add Rewards (Admin)
```
Pool owner → Enter reward amount → Click "Add Rewards" → Sign → Pool reward reserve increased
```

## CLI Commands

```bash
# Initialize staking pool
lumio move run --function-id '<deployer>::staking::initialize_pool' \
  --args 'u64:10000000000'

# Stake tokens
lumio move run --function-id '<deployer>::staking::stake' \
  --args 'address:<pool_addr>' 'u64:1000000000'

# Unstake tokens
lumio move run --function-id '<deployer>::staking::unstake' \
  --args 'address:<pool_addr>' 'u64:500000000'

# Claim rewards
lumio move run --function-id '<deployer>::staking::claim_rewards'

# Add rewards (pool owner)
lumio move run --function-id '<deployer>::staking::add_rewards' \
  --args 'u64:5000000000'

# View pool info
lumio move view --function-id '<deployer>::staking::get_pool_info' \
  --args 'address:<pool_addr>'

# View user stake
lumio move view --function-id '<deployer>::staking::get_user_stake' \
  --args 'address:<user_addr>'

# View pending rewards
lumio move view --function-id '<deployer>::staking::get_pending_rewards' \
  --args 'address:<user_addr>'
```

## APY Calculation (Frontend)

```typescript
// Simple APY calculation for display
const calculateAPY = (rewardRatePercent: number) => {
  // Assuming instant rewards on stake
  // Real APY would depend on reward frequency
  return rewardRatePercent; // 10% in this template
}

// Estimated rewards
const estimateRewards = (stakeAmount: bigint, rewardRate: number) => {
  return (stakeAmount * BigInt(rewardRate)) / 100n;
}
```

## Testing Checklist

- [ ] Deploy contract to testnet
- [ ] Create staking pool with initial rewards
- [ ] Stake tokens and verify reward calculation
- [ ] Verify total_staked increases
- [ ] Unstake partial amount
- [ ] Unstake full amount
- [ ] Claim rewards
- [ ] Verify rewards reset after claim
- [ ] Add more rewards to pool
- [ ] Test staking when reward pool is empty
- [ ] Test insufficient balance errors
- [ ] Test zero amount errors
- [ ] Multiple users staking simultaneously
