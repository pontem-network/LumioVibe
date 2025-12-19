---
name: move-syntax
type: repo
version: 1.0.0
agent: CodeActAgent
---

# Move Language Reference for Lumio

## Where to Find Examples

After running `lumio move compile`, the Lumio Framework is downloaded to:
```
contract/build/<project_name>/sources/dependencies/LumioFramework/
```

Look there for real examples of Move code patterns, coin implementations, and framework modules.

## Module Structure

```move
module <address>::<module_name> {
    use std::signer;
    use std::string::String;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin; // Use LumioCoin in runtime

    // structs, constants, functions
}
```

## Move.toml Configuration

```toml
[package]
name = "MyProject"
version = "1.0.0"

[addresses]
my_addr = "_"  # Will be replaced with deployer address

[dependencies]
LumioFramework = { git = "https://github.com/pontem-network/lumio-framework.git", rev = "testnet" }
```

## Abilities

| Ability | Description | Use Case |
|---------|-------------|----------|
| `copy` | Value can be copied | Simple data types |
| `drop` | Value can be discarded | Temporary values |
| `store` | Value can be stored in global storage | Persistent data |
| `key` | Value can be used as a key in global storage | Resources |

```move
// Resource (stored on-chain)
struct Counter has key {
    value: u64
}

// Copyable struct
struct Point has copy, drop {
    x: u64,
    y: u64
}

// Storable struct
struct TokenInfo has store, drop {
    name: String,
    symbol: String
}
```

## Entry Functions

```move
public entry fun initialize(account: &signer) {
    let counter = Counter { value: 0 };
    move_to(account, counter);
}

public entry fun increment(account: &signer, amount: u64) acquires Counter {
    let counter = borrow_global_mut<Counter>(signer::address_of(account));
    counter.value = counter.value + amount;
}
```

## View Functions

```move
#[view]
public fun get_count(addr: address): u64 acquires Counter {
    borrow_global<Counter>(addr).value
}

#[view]
public fun exists_counter(addr: address): bool {
    exists<Counter>(addr)
}
```

## Global Storage Operations

```move
move_to<Counter>(account, counter);           // Move resource to account
let ref = borrow_global<Counter>(addr);       // Borrow immutable
let mut_ref = borrow_global_mut<Counter>(addr); // Borrow mutable
let exists = exists<Counter>(addr);           // Check existence
let counter = move_from<Counter>(addr);       // Remove resource
```

## Error Handling

```move
const E_NOT_INITIALIZED: u64 = 1;
const E_ALREADY_EXISTS: u64 = 2;
const E_INSUFFICIENT_BALANCE: u64 = 3;

public entry fun withdraw(account: &signer, amount: u64) acquires Balance {
    let addr = signer::address_of(account);
    assert!(exists<Balance>(addr), E_NOT_INITIALIZED);
    let balance = borrow_global_mut<Balance>(addr);
    assert!(balance.value >= amount, E_INSUFFICIENT_BALANCE);
    balance.value = balance.value - amount;
}
```

## Event Pattern

```move
use aptos_framework::event;

#[event]
struct TransferEvent has drop, store {
    from: address,
    to: address,
    amount: u64
}

public entry fun transfer(from: &signer, to: address, amount: u64) {
    event::emit(TransferEvent {
        from: signer::address_of(from),
        to,
        amount
    });
}
```

## Vector Operations

```move
use std::vector;

let v: vector<u64> = vector::empty();
let v = vector[1, 2, 3];
vector::push_back(&mut v, 4);
let last = vector::pop_back(&mut v);
let len = vector::length(&v);
```

## Working with Coins

```move
use aptos_framework::coin;
use aptos_framework::aptos_coin::AptosCoin;

public entry fun transfer_coin(from: &signer, to: address, amount: u64) {
    coin::transfer<AptosCoin>(from, to, amount);
}

#[view]
public fun get_balance(addr: address): u64 {
    coin::balance<AptosCoin>(addr)
}
```

**Note:** In Lumio, `AptosCoin` maps to `LumioCoin` at runtime. Use `aptos_framework` imports.

## Complete Example: Counter

```move
module my_addr::counter {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;

    struct Counter has key {
        value: u64
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Counter>(addr), E_NOT_INITIALIZED);
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = counter.value + 1;
    }

    #[view]
    public fun get_count(addr: address): u64 acquires Counter {
        borrow_global<Counter>(addr).value
    }
}
```

## Common Errors

| Error | Fix |
|-------|-----|
| `unbound module` | Add `use` statement |
| `missing acquires` | Add `acquires Resource` to function |
| `cannot copy` | Use reference or add `copy` ability |
| `resource already exists` | Check with `exists<>()` first |
