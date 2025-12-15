#!/bin/bash
# LumioVibe Integration Verification Script
# Usage: bash verify-integration.sh PROJECT_DIR
#
# This script automatically checks common integration issues.
# Run BEFORE browser testing to catch problems early!

set -e

PROJECT_DIR="${1:-.}"
WORKSPACE="${WORKSPACE:-/workspace}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN++)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_section() { echo -e "\n${BLUE}═══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}═══════════════════════════════════════${NC}"; }

# Resolve absolute path
if [[ ! "$PROJECT_DIR" = /* ]]; then
    PROJECT_DIR="$WORKSPACE/$PROJECT_DIR"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

echo "================================================"
echo "  LumioVibe Integration Verification"
echo "================================================"
echo "Project: $PROJECT_DIR"
echo ""

# ============================================
# SECTION 1: File Existence
# ============================================
log_section "1. File Existence Check"

check_file() {
    if [ -f "$1" ]; then
        log_pass "Found: $2"
        return 0
    else
        log_fail "Missing: $2"
        return 1
    fi
}

check_file "$PROJECT_DIR/spec.md" "spec.md"
check_file "$PROJECT_DIR/contract/sources/contract.move" "contract.move"
check_file "$PROJECT_DIR/contract/Move.toml" "Move.toml"
check_file "$PROJECT_DIR/frontend/src/hooks/useContract.ts" "useContract.ts"
check_file "$PROJECT_DIR/frontend/src/hooks/usePontem.ts" "usePontem.ts"
check_file "$PROJECT_DIR/frontend/src/pages/Home.tsx" "Home.tsx"
check_file "$PROJECT_DIR/frontend/src/pages/Documentation.tsx" "Documentation.tsx"
check_file "$PROJECT_DIR/frontend/src/utils/decimals.ts" "decimals.ts"

# ============================================
# SECTION 2: Contract Address Match
# ============================================
log_section "2. Contract Address Match"

SPEC_ADDRESS=$(grep -E "^Address:|Deployer.*:" "$PROJECT_DIR/spec.md" 2>/dev/null | head -1 | grep -oE "0x[a-fA-F0-9]+" | head -1)
CONTRACT_ADDRESS=$(grep "CONTRACT_ADDRESS" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null | grep -oE "0x[a-fA-F0-9]+" | head -1)

if [ -n "$SPEC_ADDRESS" ] && [ -n "$CONTRACT_ADDRESS" ]; then
    if [ "$SPEC_ADDRESS" = "$CONTRACT_ADDRESS" ]; then
        log_pass "Addresses match: $SPEC_ADDRESS"
    else
        log_fail "Address MISMATCH!"
        echo "       spec.md:        $SPEC_ADDRESS"
        echo "       useContract.ts: $CONTRACT_ADDRESS"
    fi
else
    log_warn "Could not extract addresses for comparison"
    [ -z "$SPEC_ADDRESS" ] && echo "       spec.md address not found"
    [ -z "$CONTRACT_ADDRESS" ] && echo "       useContract.ts address not found"
fi

# ============================================
# SECTION 3: Module Name Match
# ============================================
log_section "3. Module Name Match"

CONTRACT_MODULE=$(grep "^module" "$PROJECT_DIR/contract/sources/contract.move" 2>/dev/null | sed 's/module [^:]*::\([a-zA-Z_]*\).*/\1/')
FRONTEND_MODULE=$(grep "MODULE_NAME" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null | grep -oE "'[^']+'" | tr -d "'")

if [ -n "$CONTRACT_MODULE" ] && [ -n "$FRONTEND_MODULE" ]; then
    if [ "$CONTRACT_MODULE" = "$FRONTEND_MODULE" ]; then
        log_pass "Module names match: $CONTRACT_MODULE"
    else
        log_fail "Module name MISMATCH!"
        echo "       contract.move:  $CONTRACT_MODULE"
        echo "       useContract.ts: $FRONTEND_MODULE"
    fi

    if [ "$FRONTEND_MODULE" = "counter" ]; then
        log_warn "MODULE_NAME is still 'counter' - did you forget to rename?"
    fi
else
    log_warn "Could not extract module names for comparison"
fi

# ============================================
# SECTION 4: Function Coverage
# ============================================
log_section "4. Function Coverage"

# Extract entry functions from contract
ENTRY_FUNCS=$(grep "public entry fun" "$PROJECT_DIR/contract/sources/contract.move" 2>/dev/null | sed 's/.*public entry fun \([a-zA-Z_]*\).*/\1/')
VIEW_FUNCS=$(grep "#\[view\]" -A1 "$PROJECT_DIR/contract/sources/contract.move" 2>/dev/null | grep "public fun" | sed 's/.*public fun \([a-zA-Z_]*\).*/\1/')

log_info "Entry functions in contract:"
for func in $ENTRY_FUNCS; do
    echo "       - $func"
    # Check if function exists in useContract.ts (as camelCase or snake_case)
    camel=$(echo "$func" | sed -r 's/_([a-z])/\U\1/g')
    if grep -q "$func\|$camel" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null; then
        log_pass "  $func has wrapper"
    else
        log_fail "  $func MISSING wrapper in useContract.ts"
    fi
done

log_info "View functions in contract:"
for func in $VIEW_FUNCS; do
    echo "       - $func"
    camel=$(echo "$func" | sed -r 's/_([a-z])/\U\1/g')
    if grep -q "$func\|$camel" "$PROJECT_DIR/frontend/src/hooks/useContract.ts" 2>/dev/null; then
        log_pass "  $func has wrapper"
    else
        log_fail "  $func MISSING wrapper in useContract.ts"
    fi
done

# ============================================
# SECTION 5: Decimal Usage
# ============================================
log_section "5. Decimal Usage Check"

# Check for manual decimal conversion (bad)
MANUAL_DECIMALS=$(grep -rn "1e8\|100000000" "$PROJECT_DIR/frontend/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v decimals.ts | grep -v ".test.ts" || true)

if [ -z "$MANUAL_DECIMALS" ]; then
    log_pass "No manual decimal conversion found (good!)"
else
    log_fail "Manual decimal conversion found (should use toChainUnits/toHumanUnits):"
    echo "$MANUAL_DECIMALS" | while read line; do
        echo "       $line"
    done
fi

# Check if decimals.ts is imported
DECIMALS_IMPORTS=$(grep -rn "from.*decimals\|import.*decimals" "$PROJECT_DIR/frontend/src" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v decimals.ts || true)

if [ -n "$DECIMALS_IMPORTS" ]; then
    log_pass "decimals.ts utilities are imported"
else
    log_warn "decimals.ts utilities may not be imported anywhere"
fi

# ============================================
# SECTION 6: UI Element Check
# ============================================
log_section "6. UI Element Check"

# Check for Connect Wallet button
if grep -q "Connect.*Wallet\|connect.*wallet" "$PROJECT_DIR/frontend/src" -r --include="*.tsx" 2>/dev/null; then
    log_pass "Connect Wallet button found"
else
    log_fail "Connect Wallet button NOT FOUND!"
fi

# Check for template leftovers
if grep -q '"counter"\|Counter\|increment\|get_value' "$PROJECT_DIR/frontend/src/pages/Home.tsx" 2>/dev/null; then
    log_warn "Template 'counter' references found in Home.tsx - did you customize?"
fi

if grep -q '"counter"\|Counter\|increment\|get_value' "$PROJECT_DIR/frontend/src/pages/Documentation.tsx" 2>/dev/null; then
    log_warn "Template 'counter' references found in Documentation.tsx - did you customize?"
fi

# ============================================
# SECTION 7: Build Check
# ============================================
log_section "7. TypeScript Build Check"

cd "$PROJECT_DIR/frontend"
if pnpm tsc --noEmit 2>/dev/null; then
    log_pass "TypeScript compilation successful"
else
    log_fail "TypeScript errors found!"
    echo "       Run 'cd $PROJECT_DIR/frontend && pnpm tsc --noEmit' to see errors"
fi
cd "$WORKSPACE"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================================"
echo "  VERIFICATION SUMMARY"
echo "================================================"
echo -e "  ${GREEN}PASS: $PASS${NC}"
echo -e "  ${RED}FAIL: $FAIL${NC}"
echo -e "  ${YELLOW}WARN: $WARN${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}⛔ VERIFICATION FAILED!${NC}"
    echo "Fix the issues above before proceeding to browser testing."
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️ VERIFICATION PASSED WITH WARNINGS${NC}"
    echo "Review warnings above - they may indicate issues."
    exit 0
else
    echo -e "${GREEN}✅ VERIFICATION PASSED!${NC}"
    echo "Proceed to browser testing."
    exit 0
fi
