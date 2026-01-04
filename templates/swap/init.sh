#!/bin/bash
# Swap Template Init Script
# Usage: bash init.sh PROJECT_NAME [PROJECT_DIR]
#
# This script:
# 1. Creates/uses Lumio account
# 2. Funds account from faucet
# 3. Copies template to project directory
# 4. Replaces placeholders with actual values
# 5. Compiles and deploys the contract

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${1:-my_swap}"
WORKSPACE="${WORKSPACE:-/workspace}"
PROJECT_DIR="${2:-$WORKSPACE/$PROJECT_NAME}"
LUMIO_BIN="${LUMIO_BIN:-lumio}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "================================================"
echo "  Swap DEX Template Init: $PROJECT_NAME"
echo "================================================"
echo ""

# ============================================
# STEP 1: Initialize Lumio Account
# ============================================
log_info "Step 1/5: Setting up Lumio account..."

LUMIO_CONFIG="$WORKSPACE/.lumio/config.yaml"
DEPLOYER_ADDRESS=""
PRIVATE_KEY=""

get_from_config() {
    local key="$1"
    if [ -f "$LUMIO_CONFIG" ]; then
        grep "^[[:space:]]*${key}:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'"
    fi
}

if [ -f "$LUMIO_CONFIG" ]; then
    log_info "Using existing Lumio config..."
    DEPLOYER_ADDRESS=$(get_from_config "account")
fi

if [ -z "$DEPLOYER_ADDRESS" ]; then
    log_info "Creating new Lumio account..."
    cd "$WORKSPACE"

    GENERATED_PRIVATE_KEY=$(openssl rand -hex 32)
    $LUMIO_BIN init --assume-yes --network testnet --private-key "$GENERATED_PRIVATE_KEY" 2>&1 || true

    DEPLOYER_ADDRESS=$(get_from_config "account")

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log_error "Failed to get deployer address"
        exit 1
    fi
fi

# Ensure address has 0x prefix
if [[ ! "$DEPLOYER_ADDRESS" =~ ^0x ]]; then
    DEPLOYER_ADDRESS="0x$DEPLOYER_ADDRESS"
fi

# Extract private key
PRIVATE_KEY=$(get_from_config "private_key")
PRIVATE_KEY="${PRIVATE_KEY#ed25519-priv-}"

log_info "Deployer: $DEPLOYER_ADDRESS"

# ============================================
# STEP 2: Fund Account
# ============================================
log_info "Step 2/5: Funding account..."

FUNDED=false
for attempt in 1 2 3; do
    log_info "Faucet attempt $attempt/3..."
    FUND_OUTPUT=$($LUMIO_BIN account fund-with-faucet --amount 100000000 2>&1) || true

    if echo "$FUND_OUTPUT" | grep -qi "success\|funded\|Added"; then
        log_info "Account funded!"
        FUNDED=true
        break
    fi
    sleep 5
done

if [ "$FUNDED" = false ]; then
    log_warn "Faucet failed, continuing anyway..."
fi

# ============================================
# STEP 3: Copy Template
# ============================================
log_info "Step 3/5: Copying template..."

if [ -d "$PROJECT_DIR" ]; then
    log_warn "Directory exists, removing..."
    rm -rf "$PROJECT_DIR"
fi

mkdir -p "$PROJECT_DIR"
cp -r "$SCRIPT_DIR/contract" "$PROJECT_DIR/"
cp -r "$SCRIPT_DIR/frontend" "$PROJECT_DIR/"

# ============================================
# STEP 4: Replace Placeholders
# ============================================
log_info "Step 4/5: Configuring project..."

replace_placeholder() {
    local file="$1"
    local placeholder="$2"
    local value="$3"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|$placeholder|$value|g" "$file"
    else
        sed -i "s|$placeholder|$value|g" "$file"
    fi
}

# Replace in Move contract files only
find "$PROJECT_DIR/contract" -type f \( -name "*.move" -o -name "*.toml" \) | while read file; do
    replace_placeholder "$file" "__PROJECT_NAME__" "$PROJECT_NAME"
    replace_placeholder "$file" "__DEPLOYER_ADDRESS__" "$DEPLOYER_ADDRESS"
done

# Replace project name in frontend package.json
replace_placeholder "$PROJECT_DIR/frontend/package.json" "__PROJECT_NAME__" "$PROJECT_NAME"

# Create .env file for frontend with contract address
cat > "$PROJECT_DIR/frontend/.env" << EOF
VITE_CONTRACT_ADDRESS=$DEPLOYER_ADDRESS
VITE_PRIVATE_KEY=$PRIVATE_KEY
VITE_NETWORK=testnet
VITE_API_URL=https://api.testnet.lumio.io/v1
EOF

log_info "Created .env file with contract address"

# ============================================
# STEP 5: Compile and Deploy Contract
# ============================================
log_info "Step 5/5: Deploying contract..."

cd "$PROJECT_DIR/contract"

log_info "Compiling contract..."
COMPILE_OUT=$($LUMIO_BIN move compile --package-dir . 2>&1) || true
if ! echo "$COMPILE_OUT" | grep -qi "BUILDING\|Result"; then
    log_error "Compile failed: $COMPILE_OUT"
    exit 1
fi

log_info "Publishing contract..."
PUBLISH_OUT=$($LUMIO_BIN move deploy --package-dir . --assume-yes 2>&1) || true
if echo "$PUBLISH_OUT" | grep -qi "success\|published\|Transaction"; then
    log_info "Contract deployed!"
else
    log_warn "Deploy output: $PUBLISH_OUT"
fi

cd "$WORKSPACE"

# ============================================
# DONE
# ============================================
echo ""
echo "================================================"
echo -e "${GREEN}  Template initialized successfully!${NC}"
echo "================================================"
echo ""
echo "Project: $PROJECT_DIR"
echo "Deployer: $DEPLOYER_ADDRESS"
echo ""
echo "Contract Functions:"
echo "  - initialize: Create the DEX"
echo "  - register: Register user for trading"
echo "  - mint_tokens: Get test tokens"
echo "  - create_pool: Create a liquidity pool"
echo "  - add_liquidity: Add liquidity to pool"
echo "  - remove_liquidity: Remove liquidity"
echo "  - swap_exact_input: Swap tokens"
echo ""
echo "Next: Run start.sh to launch the frontend"
echo ""

# Save project info
echo "$PROJECT_DIR" > /tmp/lumiovibe-current-project
echo "$DEPLOYER_ADDRESS" > /tmp/lumiovibe-deployer-address
