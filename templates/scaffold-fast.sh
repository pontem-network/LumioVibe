#!/bin/bash
# LumioVibe Fast Scaffold - Single script to setup everything
# Usage: bash scaffold-fast.sh PROJECT_NAME

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_NAME="${1:-my_project}"
WORKSPACE="${WORKSPACE:-/workspace}"
OUTPUT_DIR="$WORKSPACE/$PROJECT_NAME"
LUMIO_BIN="${LUMIO_BIN:-lumio}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ -z "$PROJECT_NAME" ] || [ "$PROJECT_NAME" = "--help" ]; then
    echo "Usage: bash scaffold-fast.sh PROJECT_NAME"
    echo ""
    echo "Creates a complete LumioVibe project with:"
    echo "  - Funded Lumio account"
    echo "  - Move contract template"
    echo "  - React frontend template"
    exit 0
fi

echo "================================================"
echo "  LumioVibe Fast Scaffold: $PROJECT_NAME"
echo "================================================"
echo ""

# ============================================
# Source modular generators
# ============================================
source "$SCRIPT_DIR/contract/generate.sh"
source "$SCRIPT_DIR/frontend/generate-config.sh"
source "$SCRIPT_DIR/frontend/generate-types.sh"
source "$SCRIPT_DIR/frontend/generate-hooks.sh"
source "$SCRIPT_DIR/frontend/generate-pages.sh"

# ============================================
# STEP 1: Initialize Lumio CLI if needed
# ============================================
log_info "Step 1/5: Checking Lumio CLI..."

LUMIO_CONFIG="$WORKSPACE/.lumio/config.yaml"
DEPLOYER_ADDRESS=""
PRIVATE_KEY=""

# Function to extract values from config.yaml
get_from_config() {
    local key="$1"
    if [ -f "$LUMIO_CONFIG" ]; then
        grep "^[[:space:]]*${key}:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'"
    fi
}

if [ -f "$LUMIO_CONFIG" ]; then
    log_info "Lumio config exists, getting address from config.yaml..."
    DEPLOYER_ADDRESS=$(get_from_config "account")
fi

if [ -z "$DEPLOYER_ADDRESS" ]; then
    log_info "Initializing new Lumio account..."
    cd "$WORKSPACE"

    # Generate a random private key (32 bytes = 64 hex chars)
    GENERATED_PRIVATE_KEY=$(openssl rand -hex 32)

    # lumio init with --private-key to avoid interactive prompt
    $LUMIO_BIN init --assume-yes --network testnet --private-key "$GENERATED_PRIVATE_KEY" 2>&1 || true

    # Get address from config.yaml (lumio account list returns empty array)
    DEPLOYER_ADDRESS=$(get_from_config "account")

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log_error "Failed to get deployer address from config.yaml"
        cat "$LUMIO_CONFIG" 2>/dev/null || echo "Config file not found"
        exit 1
    fi
fi

# Ensure address has 0x prefix
if [[ ! "$DEPLOYER_ADDRESS" =~ ^0x ]]; then
    DEPLOYER_ADDRESS="0x$DEPLOYER_ADDRESS"
fi

# Extract private key from config for test mode
PRIVATE_KEY=$(get_from_config "private_key")
# Remove ed25519-priv- prefix if present
PRIVATE_KEY="${PRIVATE_KEY#ed25519-priv-}"

log_info "Deployer: $DEPLOYER_ADDRESS"

# ============================================
# STEP 2: Fund account
# ============================================
log_info "Step 2/5: Funding account..."

FUND_OUTPUT=$($LUMIO_BIN account fund-with-faucet --amount 100000000 2>&1) || true
if echo "$FUND_OUTPUT" | grep -qi "success\|funded\|Added"; then
    log_info "Account funded successfully"
else
    log_warn "Faucet response: $FUND_OUTPUT"
    log_warn "Continuing anyway (account may already have funds)"
fi

# ============================================
# STEP 3: Create project structure
# ============================================
log_info "Step 3/5: Creating project structure..."

if [ -d "$OUTPUT_DIR" ]; then
    log_warn "Directory $OUTPUT_DIR already exists, removing..."
    rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

# ============================================
# STEP 4: Create Move contract
# ============================================
log_info "Step 4/5: Creating Move contract..."

generate_contract "$OUTPUT_DIR" "$PROJECT_NAME" "$DEPLOYER_ADDRESS"

# Try to compile
log_info "Compiling contract (caching framework)..."
cd "$OUTPUT_DIR/contract"
COMPILE_OUT=$($LUMIO_BIN move compile --package-dir . 2>&1) || true
if echo "$COMPILE_OUT" | grep -qi "BUILDING\|Result"; then
    log_info "Contract compiled successfully!"
else
    log_warn "Compile output: $(echo "$COMPILE_OUT" | tail -3)"
fi
cd "$WORKSPACE"

# ============================================
# STEP 5: Create Frontend
# ============================================
log_info "Step 5/5: Creating frontend..."

generate_frontend_config "$OUTPUT_DIR" "$PROJECT_NAME"
generate_types "$OUTPUT_DIR" "$DEPLOYER_ADDRESS" "$PRIVATE_KEY"
generate_hooks "$OUTPUT_DIR" "$DEPLOYER_ADDRESS"
generate_pages "$OUTPUT_DIR" "$PROJECT_NAME"

# Install frontend dependencies
log_info "Installing frontend dependencies..."
cd "$OUTPUT_DIR/frontend"
pnpm install --silent 2>&1 || pnpm install 2>&1 || true
cd "$WORKSPACE"

# ============================================
# DONE
# ============================================

# Save project info
cat > "$OUTPUT_DIR/spec.md" <<EOF
# $PROJECT_NAME

## Deployer
Address: $DEPLOYER_ADDRESS

## Contract
Module: ${PROJECT_NAME}::counter
Status: Ready to deploy

## Commands

### Compile contract
\`\`\`bash
cd $OUTPUT_DIR/contract
lumio move compile --package-dir .
\`\`\`

### Deploy contract
\`\`\`bash
cd $OUTPUT_DIR/contract
lumio move publish --package-dir . --assume-yes
\`\`\`

### Run frontend (Test Mode - no wallet needed)
\`\`\`bash
cd $OUTPUT_DIR/frontend
pnpm dev:test --host --port \$APP_PORT_1
\`\`\`

### Run frontend (Production Mode - requires Pontem Wallet)
\`\`\`bash
cd $OUTPUT_DIR/frontend
pnpm dev --host --port \$APP_PORT_1
\`\`\`
EOF

echo ""
echo "================================================"
echo -e "${GREEN}  Project created successfully!${NC}"
echo "================================================"
echo ""
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Location: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. cd $OUTPUT_DIR/contract"
echo "  2. lumio move compile --package-dir ."
echo "  3. lumio move publish --package-dir . --assume-yes"
echo "  4. cd ../frontend && pnpm dev:test --host"
echo ""
