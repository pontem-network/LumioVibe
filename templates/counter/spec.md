# Counter Template Specification

## Overview

Simple counter dApp demonstrating basic Move development patterns on Lumio Network. Ideal for beginners learning Move smart contracts and blockchain interaction.

**Difficulty:** Beginner
**Category:** Starter
**Network:** Lumio Testnet

## Smart Contract

### Module: `counter::counter`

#### Data Structures

| Struct | Abilities | Fields | Description |
|--------|-----------|--------|-------------|
| `Counter` | `key` | `value: u64` | Stores counter value per account |

#### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NOT_INITIALIZED` | Counter not initialized for this address |
| 2 | `E_ALREADY_INITIALIZED` | Counter already exists for this address |

#### Entry Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `initialize(account: &signer)` | Account signer | Creates new Counter with value 0 |
| `increment(account: &signer)` | Account signer | Increments counter by 1 |

#### View Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_value(addr: address)` | Account address | `u64` | Returns current counter value |
| `exists_at(addr: address)` | Account address | `bool` | Checks if counter exists |

## Frontend Integration

### Hooks

```typescript
// useContract.ts - Contract interaction
const useContract = () => {
  initialize(): Promise<void>   // Initialize counter
  increment(): Promise<void>    // Increment counter
  getValue(): Promise<number>   // Get counter value
  exists(): Promise<boolean>    // Check if initialized
}

// usePontem.ts - Wallet connection
const usePontem = () => {
  account: string | null        // Connected wallet address
  connect(): Promise<void>      // Connect Pontem Wallet
  disconnect(): void            // Disconnect wallet
  isConnected: boolean          // Connection status
}
```

### Pages

- **Home** - Main counter interface with increment button and value display

### Features

- Counter value display
- Initialize counter button (shown when not initialized)
- Increment button (shown when initialized)
- Real-time value updates
- Wallet connection status

## User Flows

### 1. Initialize Counter
```
Connect Wallet → Click "Initialize" → Sign Transaction → Counter Created (value=0)
```

### 2. Increment Counter
```
Connected + Initialized → Click "Increment" → Sign Transaction → Value Updated
```

### 3. View Counter
```
Enter address → Call get_value → Display current value
```

## CLI Commands

```bash
# Initialize counter
lumio move run --function-id '<deployer>::counter::initialize'

# Increment counter
lumio move run --function-id '<deployer>::counter::increment'

# Get value (view function)
lumio move view --function-id '<deployer>::counter::get_value' --args 'address:<addr>'

# Check if exists
lumio move view --function-id '<deployer>::counter::exists_at' --args 'address:<addr>'
```

## Testing Checklist

- [ ] Deploy contract to testnet
- [ ] Initialize counter from UI
- [ ] Increment counter multiple times
- [ ] Verify value updates correctly
- [ ] Test with different wallet addresses
- [ ] Error handling for uninitialized counter
