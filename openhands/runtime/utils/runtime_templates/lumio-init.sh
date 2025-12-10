#!/bin/bash
set -e

# LumioVibe Runtime Initialization
# This script prepares the environment for fast contract development

WORKSPACE=/workspace
TEMPLATE_PROJECT=$WORKSPACE/.lumio-template

echo "=== LumioVibe Runtime Init ==="

# 1. Initialize Lumio account (creates unique keypair per session)
echo "[1/5] Creating Lumio account..."
if [ ! -f ~/.lumio/config.yaml ]; then
    lumio init --network testnet --assume-yes 2>&1 | grep -v "Warning" || true
fi

# 2. Fund account from faucet
echo "[2/5] Funding account from faucet..."
FUND_OUTPUT=$(lumio account fund-with-faucet --amount 100000000 2>&1 || true)
if echo "$FUND_OUTPUT" | grep -q "success\|funded\|Success"; then
    echo "✓ Account funded"
else
    echo "⚠ Faucet may be rate-limited, will retry on first use"
fi

# 3. Get deployer address
echo "[3/5] Getting deployer address..."
DEPLOYER_ADDRESS=$(lumio account list 2>/dev/null | grep "Account Address:" | awk '{print $3}' | head -1)
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "⚠ Could not get address, will set on first fund"
    DEPLOYER_ADDRESS="0x1"  # Placeholder
fi
echo "Deployer address: $DEPLOYER_ADDRESS"

# 4. Prepare template counter project
echo "[4/5] Preparing template project..."
mkdir -p $TEMPLATE_PROJECT/contract/sources

# Copy and process Move.toml
cp /openhands/templates/move/Move.toml.template $TEMPLATE_PROJECT/contract/Move.toml
sed -i "s/{{PROJECT_NAME}}/template_counter/g" $TEMPLATE_PROJECT/contract/Move.toml
sed -i "s/{{DEPLOYER_ADDRESS}}/$DEPLOYER_ADDRESS/g" $TEMPLATE_PROJECT/contract/Move.toml

# Copy and process counter.move
cp /openhands/templates/move/sources/counter.move.template $TEMPLATE_PROJECT/contract/sources/counter.move
sed -i "s/{{PROJECT_NAME}}/template_counter/g" $TEMPLATE_PROJECT/contract/sources/counter.move

# Copy .gitignore
cp /openhands/templates/move/.gitignore $TEMPLATE_PROJECT/contract/

# 5. Pre-compile to cache framework
echo "[5/5] Pre-compiling to cache Lumio framework..."
cd $TEMPLATE_PROJECT/contract
COMPILE_OUTPUT=$(lumio move compile --package-dir . 2>&1 || true)
if echo "$COMPILE_OUTPUT" | grep -q "BUILDING\|Result"; then
    echo "✓ Template compiled, framework cached"
else
    echo "⚠ Compilation will happen on first use"
fi

# Create info file
cat > $TEMPLATE_PROJECT/INFO.txt <<EOF
LumioVibe Template Project
==========================

Deployer Address: $DEPLOYER_ADDRESS
Template Name: template_counter

This pre-compiled project caches the Lumio framework dependencies.
To start a new project, run:
  bash /openhands/templates/scaffold.sh YOUR_PROJECT_NAME

The scaffold script will:
1. Copy this template
2. Replace 'template_counter' with your project name
3. You're ready to write contract logic!

Frameworks already cached:
- LumioFramework
- LumioStdlib
- MoveStdlib

No need to download on first compile!
EOF

echo "=== LumioVibe Ready ==="
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Template: $TEMPLATE_PROJECT"
echo ""
