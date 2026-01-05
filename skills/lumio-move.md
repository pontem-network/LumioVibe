---
name: lumio-move
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- move
- smart contract
- lumio contract
- move language
---

# Move Smart Contract Development for Lumio

## Lumio Network

Lumio is a Layer 2 network. Key constants:
- Testnet API: `https://api.testnet.lumio.io/v1`
- Chain ID: 2 (Lumio Testnet)
- Native coin: `0x1::lumio_coin::LumioCoin`

## Project Structure

```
/workspace/app/contract/
├── Move.toml
└── sources/
    ├── module.move       # Main contract
    └── module_tests.move # Tests
```

## Move.toml Template

```toml
[package]
name = "MyProject"
version = "1.0.0"

[addresses]
my_addr = "_"  # Replaced with deployer address

[dependencies]
LumioFramework = { git = "https://github.com/pontem-network/lumio-framework.git", rev = "testnet" }
```

## Contract Template

```move
module my_addr::my_module {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_EXISTS: u64 = 2;

    struct MyResource has key {
        value: u64
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<MyResource>(addr), E_ALREADY_EXISTS);
        move_to(account, MyResource { value: 0 });
    }

    public entry fun update(account: &signer, new_value: u64) acquires MyResource {
        let addr = signer::address_of(account);
        let resource = borrow_global_mut<MyResource>(addr);
        resource.value = new_value;
    }

    #[view]
    public fun get_value(addr: address): u64 acquires MyResource {
        borrow_global<MyResource>(addr).value
    }

    #[view]
    public fun exists_at(addr: address): bool {
        exists<MyResource>(addr)
    }
}
```

## Test Template

```move
#[test_only]
module my_addr::my_module_tests {
    use std::signer;
    use my_addr::my_module;

    #[test(account = @my_addr)]
    fun test_initialize(account: &signer) {
        my_module::initialize(account);
        assert!(my_module::exists_at(signer::address_of(account)), 1);
        assert!(my_module::get_value(signer::address_of(account)) == 0, 2);
    }
}
```

## Essential Commands

```bash
# Compile
cd /workspace/app/contract
lumio move compile --package-dir .

# Test (MANDATORY before deploy!)
lumio move test --package-dir .

# Deploy (same account)
lu redeploy

# Deploy with new account (for ABI changes)
lu redeploy --new-account
```

## Working with Native Coin (LumioCoin)

```move
use lumio_framework::coin;
use lumio_framework::lumio_coin::LumioCoin;

public entry fun transfer(from: &signer, to: address, amount: u64) {
    coin::transfer<LumioCoin>(from, to, amount);
}

#[view]
public fun get_balance(addr: address): u64 {
    coin::balance<LumioCoin>(addr)
}
```

## Events

```move
use lumio_framework::event;

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

## Common Errors

| Error | Fix |
|-------|-----|
| `unbound module` | Add `use` statement |
| `missing acquires` | Add `acquires Resource` to function |
| `cannot copy` | Use reference or add `copy` ability |
| `resource already exists` | Check with `exists<>()` first |
| `BACKWARD_INCOMPATIBLE` | Use `--new-account` flag |
