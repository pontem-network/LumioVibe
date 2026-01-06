# Fungible Token Template Specification

## Overview

Create your own fungible token with full ERC20-like functionality: mint, burn, transfer, and balance tracking. Learn token economics and DeFi basics on Lumio Network.

**Difficulty:** Beginner
**Category:** DeFi
**Network:** Lumio Testnet

## Smart Contract

### Module: `token::token`

#### Data Structures

| Struct | Abilities | Fields | Description |
|--------|-----------|--------|-------------|
| `TokenInfo` | `key` | `name: String`, `symbol: String`, `decimals: u8`, `total_supply: u64`, `owner: address` | Token metadata and supply info |
| `Balance` | `key` | `value: u64` | User's token balance |

#### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NOT_INITIALIZED` | Token or balance not initialized |
| 2 | `E_ALREADY_INITIALIZED` | Token already created |
| 3 | `E_INSUFFICIENT_BALANCE` | Not enough tokens |
| 4 | `E_ZERO_AMOUNT` | Amount must be > 0 |
| 5 | `E_NOT_OWNER` | Only token owner can mint |

#### Entry Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `initialize(account, name, symbol, decimals)` | Signer, `vector<u8>`, `vector<u8>`, `u8` | Create new token |
| `register(account)` | Signer | Register address to hold tokens |
| `mint(account, to, amount)` | Signer, `address`, `u64` | Mint tokens (owner only) |
| `burn(account, amount)` | Signer, `u64` | Burn tokens from caller |
| `transfer(from, to, amount)` | Signer, `address`, `u64` | Transfer tokens |

#### View Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_balance(addr)` | `address` | `u64` | Get token balance |
| `get_total_supply(token_addr)` | `address` | `u64` | Get total supply |
| `get_token_info(token_addr)` | `address` | `(String, String, u8, u64)` | Get name, symbol, decimals, supply |
| `is_initialized(addr)` | `address` | `bool` | Check if token exists |
| `is_registered(addr)` | `address` | `bool` | Check if address can hold tokens |

## Frontend Integration

### Hooks

```typescript
// useContract.ts - Token operations
const useContract = () => {
  initialize(name: string, symbol: string, decimals: number): Promise<void>
  register(): Promise<void>
  mint(to: string, amount: bigint): Promise<void>
  burn(amount: bigint): Promise<void>
  transfer(to: string, amount: bigint): Promise<void>
  getBalance(addr: string): Promise<bigint>
  getTokenInfo(): Promise<TokenInfo>
  getTotalSupply(): Promise<bigint>
}

interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}
```

### Pages

- **Home** - Token dashboard with balance, mint/burn controls

### Features

- Token creation with custom name/symbol/decimals
- Mint tokens (owner only)
- Burn tokens
- Transfer to other addresses
- Balance display with formatting
- Total supply tracking

## User Flows

### 1. Create Token
```
Connect Wallet → Enter Name/Symbol/Decimals → Click "Create Token" → Sign → Token Deployed
```

### 2. Register User
```
New user → Click "Register" → Sign → Can now receive tokens
```

### 3. Mint Tokens (Owner)
```
Enter recipient + amount → Click "Mint" → Sign → Tokens minted, supply increased
```

### 4. Transfer Tokens
```
Enter recipient + amount → Click "Transfer" → Sign → Balance updated
```

### 5. Burn Tokens
```
Enter amount → Click "Burn" → Sign → Tokens destroyed, supply decreased
```

## CLI Commands

```bash
# Create token
lumio move run --function-id '<deployer>::token::initialize' \
  --args 'string:MyToken' 'string:MTK' 'u8:8'

# Register user
lumio move run --function-id '<deployer>::token::register'

# Mint tokens
lumio move run --function-id '<deployer>::token::mint' \
  --args 'address:<recipient>' 'u64:1000000000'

# Transfer tokens
lumio move run --function-id '<deployer>::token::transfer' \
  --args 'address:<recipient>' 'u64:100000000'

# Burn tokens
lumio move run --function-id '<deployer>::token::burn' \
  --args 'u64:50000000'

# View balance
lumio move view --function-id '<deployer>::token::get_balance' \
  --args 'address:<addr>'

# View token info
lumio move view --function-id '<deployer>::token::get_token_info' \
  --args 'address:<token_addr>'
```

## Testing Checklist

- [ ] Deploy contract to testnet
- [ ] Create token with custom metadata
- [ ] Register multiple users
- [ ] Mint tokens to registered users
- [ ] Transfer between users
- [ ] Burn tokens
- [ ] Verify total supply updates
- [ ] Test insufficient balance errors
- [ ] Test unregistered user errors
- [ ] Test non-owner mint attempt
