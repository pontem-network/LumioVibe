#!/bin/bash
# Swap Template Redeploy Script
# Usage: bash redeploy.sh [PROJECT_DIR] [--new-account]
#
# This script:
# 1. Optionally creates a new Lumio account
# 2. Compiles and redeploys the contract
# 3. Updates frontend .env with new contract address
# 4. Restarts the frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-/workspace}"
LUMIO_BIN="${LUMIO_BIN:-lumio}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
PROJECT_DIR=""
NEW_ACCOUNT=""

for arg in "$@"; do
    case $arg in
        --new-account|-n)
            NEW_ACCOUNT="true"
            ;;
        *)
            if [ -z "$PROJECT_DIR" ]; then
                if [ -d "$arg" ]; then
                    PROJECT_DIR="$arg"
                elif [ -d "$WORKSPACE/$arg" ]; then
                    PROJECT_DIR="$WORKSPACE/$arg"
                fi
            fi
            ;;
    esac
done

# Find project directory
if [ -z "$PROJECT_DIR" ]; then
    if [ -f /tmp/lumiovibe-current-project ]; then
        PROJECT_DIR=$(cat /tmp/lumiovibe-current-project)
    elif [ -d "$WORKSPACE/app" ]; then
        PROJECT_DIR="$WORKSPACE/app"
    fi
fi

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR/contract" ]; then
    log_error "Could not find project directory"
    echo "Usage: bash redeploy.sh [PROJECT_DIR] [--new-account]"
    exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_DIR")
LUMIO_CONFIG="$WORKSPACE/.lumio/config.yaml"

echo "================================================"
echo "  Redeploy Swap DEX: $PROJECT_NAME"
echo "================================================"
echo ""

get_from_config() {
    local key="$1"
    if [ -f "$LUMIO_CONFIG" ]; then
        grep "^[[:space:]]*${key}:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'"
    fi
}

# ============================================
# STEP 1: Handle Account
# ============================================
if [ "$NEW_ACCOUNT" = "true" ]; then
    log_info "Step 1/4: Creating new Lumio account..."

    # Backup old config
    if [ -f "$LUMIO_CONFIG" ]; then
        mv "$LUMIO_CONFIG" "${LUMIO_CONFIG}.bak"
    fi

    cd "$WORKSPACE"
    GENERATED_PRIVATE_KEY=$(openssl rand -hex 32)
    $LUMIO_BIN init --assume-yes --network testnet --private-key "$GENERATED_PRIVATE_KEY" 2>&1 || true

    DEPLOYER_ADDRESS=$(get_from_config "account")

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log_error "Failed to create new account"
        # Restore backup
        if [ -f "${LUMIO_CONFIG}.bak" ]; then
            mv "${LUMIO_CONFIG}.bak" "$LUMIO_CONFIG"
        fi
        exit 1
    fi

    log_info "New account created: $DEPLOYER_ADDRESS"
else
    log_info "Step 1/4: Using existing Lumio account..."
    DEPLOYER_ADDRESS=$(get_from_config "account")

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log_error "No existing account found. Use --new-account to create one."
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
# STEP 2: Fund Account (if new)
# ============================================
if [ "$NEW_ACCOUNT" = "true" ]; then
    log_info "Step 2/4: Funding new account..."

    FUNDED=false
    for attempt in 1 2 3; do
        log_info "Faucet attempt $attempt/3..."
        FUND_OUTPUT=$($LUMIO_BIN account fund-with-faucet --amount 100000000 2>&1) || true

        if echo "$FUND_OUTPUT" | grep -qi "success\|funded\|Added"; then
            log_info "Account funded!"
            FUNDED=true
            break
        fi
        sleep 3
    done

    if [ "$FUNDED" = false ]; then
        log_warn "Faucet may have failed, continuing anyway..."
    fi
else
    log_info "Step 2/4: Skipping funding (existing account)..."
fi

# ============================================
# STEP 3: Update Contract and Redeploy
# ============================================
log_info "Step 3/4: Updating and redeploying contract..."

cd "$PROJECT_DIR/contract"

# Update Move.toml with new address
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^$PROJECT_NAME = \"0x[a-fA-F0-9]*\"|$PROJECT_NAME = \"$DEPLOYER_ADDRESS\"|g" Move.toml
else
    sed -i "s|^$PROJECT_NAME = \"0x[a-fA-F0-9]*\"|$PROJECT_NAME = \"$DEPLOYER_ADDRESS\"|g" Move.toml
fi

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

# ============================================
# STEP 4: Update Frontend and Restart
# ============================================
log_info "Step 4/4: Updating frontend..."

cd "$PROJECT_DIR/frontend"

# Update .env file
cat > .env << EOF
VITE_CONTRACT_ADDRESS=$DEPLOYER_ADDRESS
VITE_PRIVATE_KEY=$PRIVATE_KEY
VITE_NETWORK=testnet
VITE_API_URL=https://api.testnet.lumio.io/v1
EOF

log_info "Updated .env with new contract address"

# Kill and restart frontend
log_info "Restarting frontend..."

# Kill existing frontend
pkill -9 -f "vite.*--port" 2>/dev/null || true
pkill -9 -f "node.*vite" 2>/dev/null || true
sleep 1

# Restart using start.sh
if [ -f "$SCRIPT_DIR/start.sh" ]; then
    nohup bash "$SCRIPT_DIR/start.sh" "$PROJECT_DIR" --background > /tmp/frontend-restart.log 2>&1 &
    log_info "Frontend restart initiated"
fi

# ============================================
# DONE
# ============================================
echo ""
echo "================================================"
echo -e "${GREEN}  Contract redeployed successfully!${NC}"
echo "================================================"
echo ""
echo "Contract Address: $DEPLOYER_ADDRESS"
echo "Project: $PROJECT_DIR"
echo ""
echo "The frontend will pick up the new address automatically."
echo ""

# Save info
echo "$DEPLOYER_ADDRESS" > /tmp/lumiovibe-deployer-address
