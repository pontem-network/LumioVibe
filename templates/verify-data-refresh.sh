#!/bin/bash
# LumioVibe Data Refresh Verification Script
# Usage: bash verify-data-refresh.sh PROJECT_DIR
#
# This script TESTS that view functions actually return data from blockchain
# and that data changes after transactions.
# RUN THIS IN TEST MODE (pnpm start:test must be running on $APP_PORT_2)

set -e

PROJECT_DIR="${1:-.}"
WORKSPACE="${WORKSPACE:-/workspace}"
LUMIO_RPC="https://api.testnet.lumio.io/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN++)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_section() { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}"; }
log_step() { echo -e "${BLUE}→${NC} $1"; }

# Resolve absolute path
if [[ ! "$PROJECT_DIR" = /* ]]; then
    PROJECT_DIR="$WORKSPACE/$PROJECT_DIR"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

echo "================================================"
echo "  LumioVibe DATA REFRESH Verification"
echo "================================================"
echo "Project: $PROJECT_DIR"
echo ""

# ============================================
# Extract contract info
# ============================================
CONTRACT_ADDRESS=$(grep "CONTRACT_ADDRESS" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null | grep -oE "0x[a-fA-F0-9]+" | head -1)
MODULE_NAME=$(grep "MODULE_NAME" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null | grep -oE "'[^']+'" | tr -d "'")

if [ -z "$CONTRACT_ADDRESS" ] || [ -z "$MODULE_NAME" ]; then
    echo -e "${RED}Could not extract CONTRACT_ADDRESS or MODULE_NAME from useContract.ts${NC}"
    exit 1
fi

log_info "Contract: $CONTRACT_ADDRESS::$MODULE_NAME"

# Get deployer address from Lumio config
DEPLOYER_ADDRESS=""
if [ -f "$WORKSPACE/.lumio/config.yaml" ]; then
    DEPLOYER_ADDRESS=$(grep "account:" "$WORKSPACE/.lumio/config.yaml" | head -1 | awk '{print $2}')
fi
if [ -z "$DEPLOYER_ADDRESS" ]; then
    DEPLOYER_ADDRESS="$CONTRACT_ADDRESS"
fi
log_info "Deployer: $DEPLOYER_ADDRESS"

# ============================================
# SECTION 1: Extract View Functions from Contract
# ============================================
log_section "1. View Functions Analysis"

VIEW_FUNCS=$(grep -B1 "public fun" "$PROJECT_DIR/contract/sources/contract.move" 2>/dev/null | grep -A1 "#\[view\]" | grep "public fun" | sed 's/.*public fun \([a-zA-Z_]*\).*/\1/' || echo "")

if [ -z "$VIEW_FUNCS" ]; then
    log_fail "No view functions found in contract!"
    echo "       Your contract MUST have view functions to display data."
    exit 1
fi

log_info "Found view functions:"
for func in $VIEW_FUNCS; do
    echo "       - $func"
done

# ============================================
# SECTION 2: Test Each View Function via RPC
# ============================================
log_section "2. View Function RPC Tests"

call_view() {
    local func_name=$1
    local args=$2

    local payload=$(cat <<EOF
{
  "function": "${CONTRACT_ADDRESS}::${MODULE_NAME}::${func_name}",
  "type_arguments": [],
  "arguments": [${args}]
}
EOF
)

    local response=$(curl -s -X POST "${LUMIO_RPC}/view" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

    echo "$response"
}

VIEW_RESULTS=()
WORKING_VIEW_FUNCS=()

for func in $VIEW_FUNCS; do
    log_step "Testing $func..."

    # Try calling with deployer address as argument (common pattern)
    result=$(call_view "$func" "\"$DEPLOYER_ADDRESS\"")

    # Check if it's an error
    if echo "$result" | grep -q "error\|Error\|ABORT\|abort"; then
        # Try without arguments
        result=$(call_view "$func" "")

        if echo "$result" | grep -q "error\|Error\|ABORT\|abort"; then
            log_warn "$func returned error (might need specific args or initialization)"
            echo "       Response: $result"
        else
            log_pass "$func works (no args)"
            echo "       Result: $result"
            WORKING_VIEW_FUNCS+=("$func")
            VIEW_RESULTS+=("$func:$result")
        fi
    else
        log_pass "$func works (with address arg)"
        echo "       Result: $result"
        WORKING_VIEW_FUNCS+=("$func")
        VIEW_RESULTS+=("$func:$result")
    fi
done

if [ ${#WORKING_VIEW_FUNCS[@]} -eq 0 ]; then
    log_fail "NO view functions return data!"
    echo ""
    echo -e "${RED}⛔ CRITICAL: Your contract is not initialized or view functions don't work.${NC}"
    echo ""
    echo "   To fix:"
    echo "   1. Make sure contract is initialized:"
    echo "      cd $PROJECT_DIR/contract && lumio move run --function-id $DEPLOYER_ADDRESS::$MODULE_NAME::initialize --assume-yes"
    echo ""
    echo "   2. Re-run this script after initialization"
    exit 1
fi

# ============================================
# SECTION 3: Check for is_initialized
# ============================================
log_section "3. Initialization Check"

if echo "$VIEW_FUNCS" | grep -q "is_initialized"; then
    result=$(call_view "is_initialized" "")
    if echo "$result" | grep -q "true"; then
        log_pass "Contract is initialized"
    else
        log_fail "Contract is NOT initialized!"
        echo ""
        echo "   Run: cd $PROJECT_DIR/contract && lumio move run --function-id $DEPLOYER_ADDRESS::$MODULE_NAME::initialize --assume-yes"
        exit 1
    fi
else
    log_warn "No is_initialized view function - cannot verify initialization status"
fi

# ============================================
# SECTION 4: Data Change Detection Test
# ============================================
log_section "4. Data Change Detection"

echo ""
echo -e "${YELLOW}This test verifies that view functions return DIFFERENT values after a transaction.${NC}"
echo ""

# Get first working view function
if [ ${#WORKING_VIEW_FUNCS[@]} -gt 0 ]; then
    TEST_FUNC="${WORKING_VIEW_FUNCS[0]}"
    log_step "Using view function: $TEST_FUNC"

    # Call BEFORE
    log_step "Calling BEFORE transaction..."
    BEFORE_RESULT=$(call_view "$TEST_FUNC" "\"$DEPLOYER_ADDRESS\"")
    if echo "$BEFORE_RESULT" | grep -q "error"; then
        BEFORE_RESULT=$(call_view "$TEST_FUNC" "")
    fi
    echo "       BEFORE: $BEFORE_RESULT"

    # Extract entry functions
    ENTRY_FUNCS=$(grep "public entry fun" "$PROJECT_DIR/contract/sources/contract.move" 2>/dev/null | sed 's/.*public entry fun \([a-zA-Z_]*\).*/\1/' | grep -v "initialize" | head -1)

    if [ -n "$ENTRY_FUNCS" ]; then
        log_info "To test data refresh, execute this entry function and re-check:"
        echo "       lumio move run --function-id $DEPLOYER_ADDRESS::$MODULE_NAME::$ENTRY_FUNCS --assume-yes"
        echo ""
        echo "       Then call the view function again and compare results."
        echo ""
        echo -e "${YELLOW}⚠️ MANUAL TEST REQUIRED:${NC}"
        echo "   1. Note the BEFORE value above"
        echo "   2. Execute a transaction (entry function)"
        echo "   3. Call the view function again"
        echo "   4. Values MUST be different!"
        echo ""
        echo "   If values are THE SAME after TX = MOCK DATA = FIX REQUIRED!"
    else
        log_warn "No non-initialize entry functions found for testing"
    fi
else
    log_fail "Cannot test data change - no working view functions"
fi

# ============================================
# SECTION 5: Frontend Hook Coverage
# ============================================
log_section "5. Frontend Hook Coverage"

log_step "Checking useContract.ts exports..."

HOOK_FILE="$PROJECT_DIR/frontend/src/hooks/useContract.ts"

# Check that view functions have wrappers that use callView
for func in $VIEW_FUNCS; do
    camel=$(echo "$func" | sed -r 's/_([a-z])/\U\1/g')

    # Check if function is defined AND uses callView
    if grep -q "callView.*$func" "$HOOK_FILE" 2>/dev/null; then
        log_pass "$func has callView wrapper"
    elif grep -q "$camel.*callView\|callView.*$camel" "$HOOK_FILE" 2>/dev/null; then
        log_pass "$camel has callView wrapper"
    else
        log_fail "$func MISSING callView wrapper in useContract.ts"
        echo "       Add: const $camel = useCallback((addr: string) => callView('$func', [addr]), [callView]);"
    fi
done

# ============================================
# SECTION 6: Check for Mock Data Patterns
# ============================================
log_section "6. Mock Data Detection"

log_step "Scanning for hardcoded data patterns..."

# Check for useState with non-zero/non-null initial values for data
MOCK_PATTERNS=$(grep -rn "useState<.*>([0-9]\+)\|useState([0-9]\+)\|useState.*\[.*{" "$PROJECT_DIR/frontend/src/pages" --include="*.tsx" 2>/dev/null | grep -v "useState(false)\|useState(true)\|useState('')\|useState(0)\|useState(null)" || true)

if [ -n "$MOCK_PATTERNS" ]; then
    log_warn "Potential mock data in useState:"
    echo "$MOCK_PATTERNS" | while read line; do
        echo "       $line"
    done
fi

# Check for console.log without actual function calls (common mock pattern)
CONSOLE_MOCKS=$(grep -rn "console.log.*Staking\|console.log.*Transfer\|console.log.*Action" "$PROJECT_DIR/frontend/src" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "test\|debug" || true)

if [ -n "$CONSOLE_MOCKS" ]; then
    log_warn "Suspicious console.log patterns (might be mock actions):"
    echo "$CONSOLE_MOCKS" | while read line; do
        echo "       $line"
    done
fi

# Check refreshData function actually calls view functions
REFRESH_DATA=$(grep -A20 "refreshData" "$PROJECT_DIR/frontend/src/pages/Home.tsx" 2>/dev/null | head -25)
if echo "$REFRESH_DATA" | grep -q "await.*callView\|await.*get"; then
    log_pass "refreshData() appears to call view functions"
else
    log_fail "refreshData() might NOT call view functions!"
    echo "       Check that refreshData() uses callView or get* functions from useContract"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================================"
echo "  DATA REFRESH VERIFICATION SUMMARY"
echo "================================================"
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"
echo -e "  ${YELLOW}WARN: $WARN${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}⛔ DATA REFRESH VERIFICATION FAILED!${NC}"
    echo ""
    echo "Your frontend will NOT update values correctly."
    echo "Fix the issues above before proceeding."
    echo ""
    echo "Most common fixes:"
    echo "1. Initialize the contract"
    echo "2. Add callView wrappers for ALL view functions"
    echo "3. Make refreshData() call actual view functions"
    echo "4. Remove any hardcoded/mock data"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️ DATA REFRESH VERIFICATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Review warnings - they may indicate data refresh issues."
    echo ""
    echo -e "${CYAN}⚠️ IMPORTANT: You MUST still manually verify:${NC}"
    echo "1. Values display correctly in the UI"
    echo "2. Values CHANGE after a successful transaction"
    echo "3. If values don't change = MOCK DATA = FIX REQUIRED!"
    exit 0
else
    echo -e "${GREEN}✅ DATA REFRESH VERIFICATION PASSED!${NC}"
    echo ""
    echo -e "${CYAN}⚠️ IMPORTANT: You MUST still manually verify:${NC}"
    echo "1. Values display correctly in the UI"
    echo "2. Values CHANGE after a successful transaction"
    echo "3. If values don't change = MOCK DATA = FIX REQUIRED!"
    exit 0
fi
