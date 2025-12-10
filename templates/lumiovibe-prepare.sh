#!/bin/bash
# LumioVibe Quick Prepare
# Call this ONCE at the start of any LumioVibe project
# It will: init account, fund it, cache framework

set -e

echo "=== LumioVibe Quick Prepare ==="

# Check if already prepared
if [ -f /workspace/.lumio-prepared ]; then
    echo "✓ Already prepared!"
    cat /workspace/.lumio-prepared
    exit 0
fi

# 1. Fund account (creates if doesn't exist)
echo "[1/3] Funding Lumio account..."
FUND_OUTPUT=$(lumio account fund-with-faucet --amount 100000000 2>&1)
if echo "$FUND_OUTPUT" | grep -qi "success\|funded"; then
    echo "✓ Account funded"
else
    echo "Output: $FUND_OUTPUT"
    echo "⚠ Faucet may be rate-limited, continuing anyway..."
fi

# 2. Get deployer address
echo "[2/3] Getting deployer address..."
DEPLOYER_ADDRESS=$(lumio account list 2>/dev/null | grep "Account Address:" | awk '{print $3}' | head -1)
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "ERROR: Could not get deployer address"
    echo "Try running: lumio account list"
    exit 1
fi
echo "✓ Deployer: $DEPLOYER_ADDRESS"

# 3. Pre-compile template to cache framework
echo "[3/3] Caching Lumio framework (first compile)..."
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Create minimal Move.toml
cat > Move.toml <<EOF
[package]
name = "warmup"
version = "1.0.0"

[addresses]
warmup = "$DEPLOYER_ADDRESS"

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

# Create minimal module
mkdir -p sources
cat > sources/warmup.move <<EOF
module warmup::warmup {
    use std::signer;
    struct Data has key { value: u64 }
    public entry fun init(s: &signer) {
        move_to(s, Data { value: 0 });
    }
}
EOF

# Compile to cache deps
echo "Downloading and caching framework..."
COMPILE_OUTPUT=$(lumio move compile --package-dir . 2>&1)
if echo "$COMPILE_OUTPUT" | grep -qi "BUILDING\|Result"; then
    echo "✓ Framework cached!"
else
    echo "⚠ Cache compile had issues (will work on real project)"
fi

# Cleanup
cd /workspace
rm -rf "$TMP_DIR"

# Save state
cat > /workspace/.lumio-prepared <<EOF
LumioVibe Environment Prepared
==============================
Deployer Address: $DEPLOYER_ADDRESS
Framework Cached: Yes
Timestamp: $(date)

Ready to create projects!
Use: bash /openhands/templates/scaffold-fast.sh YOUR_PROJECT_NAME
EOF

echo ""
echo "=== Ready! ==="
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Framework: Cached"
echo ""
echo "Next: bash /openhands/templates/scaffold-fast.sh YOUR_PROJECT_NAME"
echo ""
