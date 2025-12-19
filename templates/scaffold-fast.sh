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
log_info "Step 1/6: Checking Lumio CLI..."

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
# STEP 2: Fund account (with retry logic)
# ============================================
log_info "Step 2/6: Funding account..."

FUNDED=false
MAX_RETRIES=3
RETRY_DELAY=10

for attempt in $(seq 1 $MAX_RETRIES); do
    log_info "Faucet attempt $attempt/$MAX_RETRIES..."
    FUND_OUTPUT=$($LUMIO_BIN account fund-with-faucet --amount 100000000 2>&1) || true

    if echo "$FUND_OUTPUT" | grep -qi "success\|funded\|Added"; then
        log_info "Account funded successfully"
        FUNDED=true
        break
    else
        if [ $attempt -lt $MAX_RETRIES ]; then
            log_warn "Faucet attempt $attempt failed, retrying in ${RETRY_DELAY}s..."
            log_warn "Response: $(echo "$FUND_OUTPUT" | head -1)"
            sleep $RETRY_DELAY
        fi
    fi
done

if [ "$FUNDED" = false ]; then
    log_warn "⚠️ Faucet failed after $MAX_RETRIES attempts"
    log_warn "Last response: $FUND_OUTPUT"
    log_warn ""
    log_warn "TROUBLESHOOTING:"
    log_warn "1. Check if faucet is available: https://faucet.testnet.lumio.io"
    log_warn "2. Try manually: lumio account fund-with-faucet --amount 100000000"
    log_warn "3. If still failing, wait a few minutes and retry"
    log_warn ""
    log_warn "Continuing with project creation (you can fund later)..."
fi

# Verify balance
BALANCE_OUTPUT=$($LUMIO_BIN account list 2>&1) || true
if echo "$BALANCE_OUTPUT" | grep -qi "balance"; then
    log_info "Balance check: $(echo "$BALANCE_OUTPUT" | grep -i "balance" | head -1)"
fi

# ============================================
# STEP 3: Create project structure
# ============================================
log_info "Step 3/6: Creating project structure..."

if [ -d "$OUTPUT_DIR" ]; then
    log_warn "Directory $OUTPUT_DIR already exists, removing..."
    rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

# ============================================
# STEP 4: Create Move contract
# ============================================
log_info "Step 4/6: Creating Move contract..."

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
log_info "Step 5/6: Creating frontend..."

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

# Save project info template (MUST BE FILLED BY AGENT!)
cat > "$OUTPUT_DIR/spec.md" <<'SPECEOF'
# PROJECT_NAME_PLACEHOLDER

## ⛔ IMPORTANT: Fill this spec BEFORE writing any code!

## Project Overview
<!-- Describe what this dApp does in 2-3 sentences -->
TODO: Fill in project description

## User Requirements
<!-- What did the user ask for? -->
TODO: Fill in user requirements

## Data Model

### On-chain Resources (Move structs)
<!-- What data will be stored on-chain? -->
```move
// Example:
// struct Counter has key {
//     value: u64
// }
```
TODO: Define your data structures

### State Variables
<!-- What state does the frontend need to track? -->
TODO: List state variables

## Entry Functions (Transactions)
<!-- Functions that modify blockchain state -->

| Function | Parameters | Description |
|----------|------------|-------------|
| TODO | TODO | TODO |

## View Functions (Read-only)
<!-- Functions that read blockchain state -->

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| TODO | TODO | TODO | TODO |

## User Flows

### Flow 1: First-time User
1. TODO: Describe steps

### Flow 2: Main Action
1. TODO: Describe steps

## Edge Cases
- TODO: What happens if...

## Deployment Info
- **Address**: DEPLOYER_ADDRESS_PLACEHOLDER
- **Network**: Lumio Testnet
- **Module**: TODO (rename from 'counter')
SPECEOF

# Replace placeholders in spec.md (works on both Linux and macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$OUTPUT_DIR/spec.md"
    sed -i '' "s/DEPLOYER_ADDRESS_PLACEHOLDER/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/spec.md"
else
    sed -i "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$OUTPUT_DIR/spec.md"
    sed -i "s/DEPLOYER_ADDRESS_PLACEHOLDER/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/spec.md"
fi

echo ""
echo "================================================"
echo -e "${GREEN}  Project created successfully!${NC}"
echo "================================================"
echo ""
echo "Deployer: $DEPLOYER_ADDRESS"
echo "Location: $OUTPUT_DIR"
echo ""

# ============================================
# STEP 6: Auto-start frontend
# ============================================
log_info "Step 6/6: Starting frontend..."

# Start frontend using universal script
if [ -n "$APP_PORT_1" ] && [ -n "$APP_BASE_URL_1" ]; then
    bash "$SCRIPT_DIR/start-frontend.sh" "$OUTPUT_DIR" --test
    echo ""
    echo "================================================"
    echo -e "${GREEN}  Frontend is running in TEST mode!${NC}"
    echo "================================================"
    echo ""
    echo "🌐 Open in browser: \$APP_BASE_URL_1"
    echo ""
    echo "Next steps:"
    echo "  1. Fill in spec.md with project requirements"
    echo "  2. Update Documentation.tsx with your spec"
    echo "  3. Implement Move contract"
    echo "  4. Deploy and test"
else
    echo ""
    echo "⚠️  APP_PORT_1 not set - frontend not auto-started"
    echo ""
    echo "To start manually:"
    echo "  bash /openhands/templates/start-frontend.sh $OUTPUT_DIR --test"
fi
echo ""
