module __PROJECT_NAME__::counter {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;

    struct Counter has key {
        value: u64,
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Counter>(addr), E_ALREADY_INITIALIZED);
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = counter.value + 1;
    }

    #[view]
    public fun get_value(addr: address): u64 acquires Counter {
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        borrow_global<Counter>(addr).value
    }

    #[view]
    public fun exists_at(addr: address): bool {
        exists<Counter>(addr)
    }
}
