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

    # Counter contract
    cat > "$OUTPUT_DIR/contract/sources/counter.move" <<EOF
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

    # .gitignore
    cat > "$OUTPUT_DIR/contract/.gitignore" <<EOF
build/
.aptos/
EOF
}
