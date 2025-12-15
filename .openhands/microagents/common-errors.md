---
name: common-errors
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- error
- bug
- fix
- problem
- wrong
- incorrect
- doesn't work
---

# Common LumioVibe Errors - MUST READ!

## ⛔ CRITICAL CHECKLIST - Before Reporting Complete

<IMPORTANT>
⚠️⚠️⚠️ YOU MUST VERIFY ALL OF THESE BEFORE FINISHING! ⚠️⚠️⚠️

**FILES THAT MUST BE CUSTOMIZED (not left as template defaults):**

| File | What to Check | Common Mistake |
|------|---------------|----------------|
| `useContract.ts` | `MODULE_NAME` matches your module | Left as `'counter'` |
| `useContract.ts` | All entry/view functions added | Only has counter functions |
| `Documentation.tsx` | Describes YOUR contract | Left with counter docs |
| `Home.tsx` | UI matches your contract | Generic counter UI |

**If ANY of these still have "counter" references = NOT COMPLETE!**
</IMPORTANT>

---

## Error Category 1: Decimals & Number Conversion

### 1.1 Double Conversion (VERY COMMON!)

**Problem:** User enters human-readable amount, but code converts twice.

```typescript
// ❌ WRONG - Double conversion
const handleStake = async () => {
  const amount = parseFloat(stakeAmount) * 100000000;  // First conversion
  await stake(amount * 100000000);  // Second conversion - BUG!
};

// ❌ ALSO WRONG - useContract already converts
// useContract.ts:
const stake = (amount: number) => callEntry('stake', [(amount * 1e8).toString()]);
// Home.tsx:
await stake(parseFloat(input) * 1e8);  // Double conversion!

// ✅ CORRECT - Convert in ONE place only
// Option A: Convert in handler
const handleStake = async () => {
  const amountInSmallestUnit = parseFloat(stakeAmount) * 100000000;
  await stake(amountInSmallestUnit);  // stake() just passes through
};

// Option B: Convert in hook (cleaner)
// useContract.ts:
const stake = (humanAmount: number) =>
  callEntry('stake', [(humanAmount * 1e8).toString()]);
// Home.tsx:
await stake(parseFloat(stakeAmount));  // Pass human-readable
```

### 1.2 Inconsistent Decimal Constants

```typescript
// ❌ WRONG - Different values in different places
const amount = value * 100000000;  // 8 zeros
const display = balance / 1e8;      // Different notation
const fee = sum * 10000000;         // 7 zeros - WRONG!

// ✅ CORRECT - Single constant
const DECIMALS = 8;
const MULTIPLIER = Math.pow(10, DECIMALS);  // or 1e8

const amount = value * MULTIPLIER;
const display = balance / MULTIPLIER;
```

### 1.3 Precision Loss with Large Numbers

```typescript
// ❌ WRONG - JavaScript loses precision
const balance = 12345678901234567890;  // Becomes 12345678901234567000
parseFloat("12345678901234567890");    // Same problem

// ✅ CORRECT - Use BigInt for large numbers
const balance = BigInt("12345678901234567890");
// Or keep as string until display
const balanceStr = "12345678901234567890";
```

### 1.4 String vs Number from View Functions

```typescript
// ❌ WRONG - View returns string, treated as number
const balance = await getBalance(account);  // Returns "1000000000"
setBalance(balance + 100);  // "1000000000100" - string concat!

// ✅ CORRECT - Parse explicitly
const balance = await getBalance(account);
setBalance(parseInt(balance) + 100);  // 1000000100 - correct
// Or better: keep as string, convert only for display
```

---

## Error Category 2: Documentation Not Updated

### 2.1 Template Documentation Left Unchanged

<IMPORTANT>
⛔⛔⛔ THIS IS A VERY COMMON MISTAKE! ⛔⛔⛔

The scaffold creates Documentation.tsx with COUNTER example functions.
You MUST update it to describe YOUR contract!
</IMPORTANT>

**Signs of unfixed documentation:**
- Shows `initialize()` and `increment()` (counter functions)
- Shows `get_value(addr)` and `exists_at(addr)` (counter views)
- No mention of your actual functions (stake, transfer, mint, etc.)

```typescript
// ❌ WRONG - Left as template (counter)
<h3 className="font-mono text-green-400">initialize()</h3>
<p>Creates a Counter resource for your account.</p>

<h3 className="font-mono text-green-400">increment()</h3>
<p>Increments your counter by 1.</p>

// ✅ CORRECT - Updated for your contract (e.g., staking)
<h3 className="font-mono text-green-400">initialize()</h3>
<p>Initializes the Moon Coin staking pool. Admin only.</p>

<h3 className="font-mono text-green-400">stake(amount: u64)</h3>
<p>Stakes LumioCoin to earn Moon token rewards.</p>

<h3 className="font-mono text-green-400">claim_rewards()</h3>
<p>Claims accumulated Moon token rewards from staking.</p>
```

**Mandatory Documentation.tsx updates:**
1. Page title - your project name
2. Entry functions section - ALL your entry functions
3. View functions section - ALL your view functions
4. Function signatures with correct parameter types
5. Descriptions matching actual contract behavior

---

## Error Category 3: useContract.ts Not Customized

### 3.1 MODULE_NAME Left as Default

```typescript
// ❌ WRONG - Template default
const MODULE_NAME = 'counter';

// ✅ CORRECT - Your actual module
const MODULE_NAME = 'moon_coin';      // or
const MODULE_NAME = 'nft_marketplace'; // or
const MODULE_NAME = 'voting';          // etc.
```

### 3.2 Missing Function Wrappers

```typescript
// ❌ WRONG - Only counter functions
return {
  initialize, increment, getCount, isInitialized,  // Counter functions
  callEntry, callView, ...
};

// ✅ CORRECT - All YOUR contract functions
return {
  // Entry functions from YOUR contract
  initialize, stake, unstake, claimRewards, transfer,
  // View functions from YOUR contract
  getStakeInfo, getBalance, getTotalStaked, getRewardRate,
  // Common
  callEntry, callView, loading, error, account,
};
```

### 3.3 Function Signature Mismatch

```typescript
// Contract: public entry fun transfer(from: &signer, to: address, amount: u64)

// ❌ WRONG - Wrong parameter order or count
const transfer = (amount: number, to: string) =>  // Order swapped!
  callEntry('transfer', [amount.toString(), to]);

// ✅ CORRECT - Match contract signature (signer is automatic)
const transfer = (to: string, amount: number) =>
  callEntry('transfer', [to, amount.toString()]);
```

---

## Error Category 4: Move Contract Bugs

### 4.1 Integer Overflow in Calculations

```move
// ❌ WRONG - Can overflow
let reward = staked_amount * time_passed * rate_per_second;

// ✅ CORRECT - Use u128 for intermediate calculations
let reward = (((staked_amount as u128) * (time_passed as u128) * (rate as u128))
              / (PRECISION as u128)) as u64;
```

### 4.2 Missing Balance Check Before Transfer

```move
// ❌ WRONG - Will abort with cryptic error
public entry fun withdraw(account: &signer, amount: u64) {
    coin::transfer<AptosCoin>(account, @treasury, amount);
}

// ✅ CORRECT - Clear error message
public entry fun withdraw(account: &signer, amount: u64) {
    let addr = signer::address_of(account);
    assert!(coin::balance<AptosCoin>(addr) >= amount, E_INSUFFICIENT_BALANCE);
    coin::transfer<AptosCoin>(account, @treasury, amount);
}
```

### 4.3 Missing Initialization Check

```move
// ❌ WRONG - Assumes resource exists
public entry fun stake(account: &signer, amount: u64) acquires Pool {
    let pool = borrow_global_mut<Pool>(@contract_addr);  // Aborts if not init!
    // ...
}

// ✅ CORRECT - Check first
public entry fun stake(account: &signer, amount: u64) acquires Pool {
    assert!(exists<Pool>(@contract_addr), E_NOT_INITIALIZED);
    let pool = borrow_global_mut<Pool>(@contract_addr);
    // ...
}

// ✅ ALSO: Add view function for frontend to check
#[view]
public fun is_initialized(): bool {
    exists<Pool>(@contract_addr)
}
```

---

## Error Category 5: Network Configuration

### 5.1 Wrong Chain ID

```typescript
// ❌ WRONG - Aptos chain IDs
if (network.chainId !== 1)   // Aptos mainnet
if (network.chainId !== 34)  // Movement testnet

// ✅ CORRECT - Lumio Testnet is ALWAYS 2
if (network.chainId !== 2) {
  await pontem.switchNetwork(2);
}
```

### 5.2 Wrong RPC URL

```typescript
// ❌ WRONG - Various Aptos URLs
const RPC = 'https://fullnode.testnet.aptoslabs.com';
const RPC = 'https://api.devnet.aptoslabs.com';
const RPC = 'https://fullnode.mainnet.aptoslabs.com';

// ✅ CORRECT - Lumio Testnet
const RPC = 'https://api.testnet.lumio.io/v1';
```

### 5.3 Wrong Native Coin

```move
// ❌ WRONG - Aptos coin
use aptos_framework::aptos_coin::AptosCoin;

// ✅ CORRECT for Lumio - AptosCoin maps to LumioCoin at runtime
// In Move code, use aptos_framework imports (they map correctly)
use aptos_framework::aptos_coin::AptosCoin;  // Maps to LumioCoin on Lumio
```

---

## Error Category 6: UI State Management

### 6.1 Not Refreshing After Transaction

```typescript
// ❌ WRONG - UI doesn't update
const handleStake = async () => {
  await stake(amount);
  setAmount('');  // Clears form but doesn't refresh data!
};

// ✅ CORRECT - Always refresh after successful TX
const handleStake = async () => {
  const result = await stake(amount);
  if (result) {
    setAmount('');
    await refreshData();  // Fetch fresh data from chain!
  }
};
```

### 6.2 Race Condition on Button Click

```typescript
// ❌ WRONG - Can submit multiple times
<button onClick={handleStake}>Stake</button>

// ✅ CORRECT - Disable during loading
<button onClick={handleStake} disabled={loading}>
  {loading ? 'Processing...' : 'Stake'}
</button>
```

### 6.3 Using Mock/Hardcoded Data

```typescript
// ❌ WRONG - Hardcoded values
const refreshData = async () => {
  setBalance(1000000000);  // MOCK!
  setStakingInfo({ amount: 500, rewards: 10 });  // MOCK!
};

// ✅ CORRECT - Always from blockchain
const refreshData = async () => {
  const bal = await getBalance(account);
  if (bal !== null) setBalance(bal);

  const info = await getStakingInfo(account);
  if (info) setStakingInfo(info);
};
```

---

## Quick Self-Check Before Finishing

```
□ MODULE_NAME in useContract.ts matches my Move module
□ All entry functions have wrappers in useContract.ts
□ All view functions have wrappers in useContract.ts
□ Documentation.tsx describes MY contract (not counter)
□ Home.tsx uses MY contract functions (not counter)
□ No "counter", "increment", "get_value" references (unless that's your contract)
□ Decimals conversion happens in exactly ONE place
□ refreshData() called after every successful transaction
□ Test Mode verified - data changes after TX
□ Production Mode running on $APP_PORT_1
```
