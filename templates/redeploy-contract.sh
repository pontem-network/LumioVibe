#!/bin/bash
# LumioVibe Redeploy Contract - Creates new account and redeploys contract
# Usage: bash redeploy-contract.sh PROJECT_DIR
#
# Use this when contract changes are ABI-incompatible and cannot be upgraded.
# This script will:
#   1. Create a new Lumio account
#   2. Fund it from faucet
#   3. Update Move.toml with new address
#   4. Update frontend config with new contract address
#   5. Compile and deploy the contract

set -e

PROJECT_DIR="${1:-.}"
WORKSPACE="${WORKSPACE:-/workspace}"
LUMIO_BIN="${LUMIO_BIN:-lumio}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Resolve absolute path
if [[ ! "$PROJECT_DIR" = /* ]]; then
    PROJECT_DIR="$WORKSPACE/$PROJECT_DIR"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

if [ ! -d "$PROJECT_DIR/contract" ]; then
    log_error "Contract directory not found: $PROJECT_DIR/contract"
    exit 1
fi

echo "================================================"
echo "  LumioVibe Contract Redeploy"
echo "================================================"
echo ""
echo "Project: $PROJECT_DIR"
echo ""

# ============================================
# STEP 1: Backup old config and create new account
# ============================================
log_info "Step 1/5: Creating new Lumio account..."

LUMIO_CONFIG="$WORKSPACE/.lumio/config.yaml"

# Get old address for reference
OLD_ADDRESS=""
if [ -f "$LUMIO_CONFIG" ]; then
    OLD_ADDRESS=$(grep "^[[:space:]]*account:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")
    log_info "Old address: $OLD_ADDRESS"

    # Backup old config
    cp "$LUMIO_CONFIG" "$LUMIO_CONFIG.backup.$(date +%s)"
fi

# Remove old config to force new account creation
rm -rf "$WORKSPACE/.lumio"

# Generate new account
cd "$WORKSPACE"
GENERATED_PRIVATE_KEY=$(openssl rand -hex 32)
$LUMIO_BIN init --assume-yes --network testnet --private-key "$GENERATED_PRIVATE_KEY" 2>&1 || true

# Get new address
NEW_ADDRESS=$(grep "^[[:space:]]*account:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")

if [ -z "$NEW_ADDRESS" ]; then
    log_error "Failed to create new account"
    exit 1
fi

# Ensure 0x prefix
if [[ ! "$NEW_ADDRESS" =~ ^0x ]]; then
    NEW_ADDRESS="0x$NEW_ADDRESS"
fi

# Get private key for test mode
NEW_PRIVATE_KEY=$(grep "^[[:space:]]*private_key:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")
NEW_PRIVATE_KEY="${NEW_PRIVATE_KEY#ed25519-priv-}"

log_info "New address: $NEW_ADDRESS"

# ============================================
# STEP 2: Fund new account
# ============================================
log_info "Step 2/5: Funding new account..."

FUND_OUTPUT=$($LUMIO_BIN account fund-with-faucet --amount 100000000 2>&1) || true
if echo "$FUND_OUTPUT" | grep -qi "success\|funded\|Added"; then
    log_info "Account funded successfully"
else
    log_warn "Faucet response: $FUND_OUTPUT"
    log_warn "Continuing anyway..."
fi

# ============================================
# STEP 3: Update Move.toml
# ============================================
log_info "Step 3/5: Updating Move.toml..."

MOVE_TOML="$PROJECT_DIR/contract/Move.toml"

if [ -f "$MOVE_TOML" ]; then
    # Update deployer address in Move.toml
    sed -i.bak "s/deployer = \"0x[a-fA-F0-9]*\"/deployer = \"$NEW_ADDRESS\"/" "$MOVE_TOML"
    rm -f "$MOVE_TOML.bak"
    log_info "Move.toml updated with new deployer address"
else
    log_error "Move.toml not found: $MOVE_TOML"
    exit 1
fi

# ============================================
# STEP 4: Update frontend config
# ============================================
log_info "Step 4/5: Updating frontend config..."

# Update useContract.ts
USE_CONTRACT="$PROJECT_DIR/frontend/src/hooks/useContract.ts"
if [ -f "$USE_CONTRACT" ]; then
    sed -i.bak "s/CONTRACT_ADDRESS = '0x[a-fA-F0-9]*'/CONTRACT_ADDRESS = '$NEW_ADDRESS'/" "$USE_CONTRACT"
    rm -f "$USE_CONTRACT.bak"
    log_info "useContract.ts updated"
fi

# Update types/index.ts for test mode
TYPES_INDEX="$PROJECT_DIR/frontend/src/types/index.ts"
if [ -f "$TYPES_INDEX" ]; then
    sed -i.bak "s/TEST_ACCOUNT_ADDRESS = '0x[a-fA-F0-9]*'/TEST_ACCOUNT_ADDRESS = '$NEW_ADDRESS'/" "$TYPES_INDEX"
    sed -i.bak "s/TEST_PRIVATE_KEY = '[a-fA-F0-9]*'/TEST_PRIVATE_KEY = '$NEW_PRIVATE_KEY'/" "$TYPES_INDEX"
    rm -f "$TYPES_INDEX.bak"
    log_info "types/index.ts updated"
fi

# Update spec.md if exists
SPEC_MD="$PROJECT_DIR/spec.md"
if [ -f "$SPEC_MD" ]; then
    sed -i.bak "s/Address: 0x[a-fA-F0-9]*/Address: $NEW_ADDRESS/" "$SPEC_MD"
    rm -f "$SPEC_MD.bak"
    log_info "spec.md updated"
fi

# ============================================
# STEP 5: Compile and Deploy
# ============================================
log_info "Step 5/5: Compiling and deploying contract..."

cd "$PROJECT_DIR/contract"

# Compile
log_info "Compiling..."
COMPILE_OUT=$($LUMIO_BIN move compile --package-dir . 2>&1) || true
if echo "$COMPILE_OUT" | grep -qi "error"; then
    log_error "Compilation failed:"
    echo "$COMPILE_OUT"
    exit 1
fi
log_info "Compilation successful"

# Deploy
log_info "Deploying..."
DEPLOY_OUT=$($LUMIO_BIN move publish --package-dir . --assume-yes 2>&1) || true
if echo "$DEPLOY_OUT" | grep -qi "error\|failed"; then
    log_error "Deployment failed:"
    echo "$DEPLOY_OUT"
    exit 1
fi

if echo "$DEPLOY_OUT" | grep -qi "success\|Result"; then
    log_info "Deployment successful!"
else
    log_warn "Deploy output: $DEPLOY_OUT"
fi

cd "$WORKSPACE"

# ============================================
# DONE
# ============================================
echo ""
echo "================================================"
echo -e "${GREEN}  Contract redeployed successfully!${NC}"
echo "================================================"
echo ""
echo "Old address: $OLD_ADDRESS"
echo "New address: $NEW_ADDRESS"
echo ""
echo "Updated files:"
echo "  - $MOVE_TOML"
echo "  - $USE_CONTRACT"
echo "  - $TYPES_INDEX"
echo ""
echo "Next steps:"
echo "  1. Restart frontend servers"
echo "  2. Initialize contract if needed"
echo "  3. Run full regression test in Test Mode"
echo ""
