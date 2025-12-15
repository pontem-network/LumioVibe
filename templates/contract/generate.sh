#!/bin/bash
# Generate Move contract files
# Usage: source this file, then call generate_contract

generate_contract() {
    local OUTPUT_DIR="$1"
    local PROJECT_NAME="$2"
    local DEPLOYER_ADDRESS="$3"

    mkdir -p "$OUTPUT_DIR/contract/sources"

    # Move.toml
    cat > "$OUTPUT_DIR/contract/Move.toml" <<EOF
[package]
name = "$PROJECT_NAME"
version = "1.0.0"
authors = []

[addresses]
$PROJECT_NAME = "$DEPLOYER_ADDRESS"

[dependencies.LumioFramework]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "lumio-framework"

[dependencies.LumioStdlib]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "lumio-stdlib"

[dependencies.MoveStdlib]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "move-stdlib"
EOF

    # Contract template (CUSTOMIZE THIS!)
    cat > "$OUTPUT_DIR/contract/sources/contract.move" <<EOF
module ${PROJECT_NAME}::counter {
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
EOF

    # Move test template
    cat > "$OUTPUT_DIR/contract/sources/contract_tests.move" <<EOF
#[test_only]
module ${PROJECT_NAME}::counter_tests {
    use std::signer;
    use ${PROJECT_NAME}::counter;

    // ⚠️ RENAME THIS MODULE to match your contract!
    // Example: ${PROJECT_NAME}::voting_tests for a voting contract

    // ============================================
    // HAPPY PATH TESTS
    // ============================================

    #[test(account = @${PROJECT_NAME})]
    fun test_initialize_succeeds(account: &signer) {
        counter::initialize(account);
        let addr = signer::address_of(account);
        assert!(counter::exists_at(addr), 1);
    }

    #[test(account = @${PROJECT_NAME})]
    fun test_increment_after_init(account: &signer) {
        counter::initialize(account);
        counter::increment(account);
        let addr = signer::address_of(account);
        assert!(counter::get_value(addr) == 1, 2);
    }

    #[test(account = @${PROJECT_NAME})]
    fun test_multiple_increments(account: &signer) {
        counter::initialize(account);
        counter::increment(account);
        counter::increment(account);
        counter::increment(account);
        let addr = signer::address_of(account);
        assert!(counter::get_value(addr) == 3, 3);
    }

    // ============================================
    // ERROR PATH TESTS
    // ============================================

    #[test(account = @${PROJECT_NAME})]
    #[expected_failure(abort_code = 2)] // E_ALREADY_INITIALIZED
    fun test_double_initialize_fails(account: &signer) {
        counter::initialize(account);
        counter::initialize(account); // Should abort
    }

    #[test(account = @${PROJECT_NAME})]
    #[expected_failure(abort_code = 1)] // E_NOT_INITIALIZED
    fun test_increment_without_init_fails(account: &signer) {
        counter::increment(account); // Should abort
    }

    #[test(account = @${PROJECT_NAME})]
    #[expected_failure(abort_code = 1)] // E_NOT_INITIALIZED
    fun test_get_value_without_init_fails(account: &signer) {
        let addr = signer::address_of(account);
        counter::get_value(addr); // Should abort
    }

    // ============================================
    // ⚠️ ADD YOUR CONTRACT-SPECIFIC TESTS BELOW!
    // ============================================
    //
    // Example tests for a staking contract:
    //
    // #[test(user = @0x123, admin = @${PROJECT_NAME})]
    // fun test_stake_succeeds(user: &signer, admin: &signer) {
    //     staking::initialize(admin);
    //     staking::stake(user, 1000000000); // 10 tokens
    //     let addr = signer::address_of(user);
    //     let (staked, _, _, _) = staking::get_stake_info(addr);
    //     assert!(staked == 1000000000, 1);
    // }
    //
    // #[test(user = @0x123)]
    // #[expected_failure(abort_code = 5)] // E_INSUFFICIENT_BALANCE
    // fun test_stake_insufficient_fails(user: &signer) {
    //     staking::stake(user, 999999999999); // More than balance
    // }
}
EOF

    # .gitignore
    cat > "$OUTPUT_DIR/contract/.gitignore" <<EOF
build/
.aptos/
EOF
}
