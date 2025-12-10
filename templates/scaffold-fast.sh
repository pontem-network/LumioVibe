#!/bin/bash
set -e

# Fast scaffold using pre-compiled template
# Usage: bash scaffold-fast.sh PROJECT_NAME [MODULE_NAME]

PROJECT_NAME="${1:-my_project}"
MODULE_NAME="${2:-$PROJECT_NAME}"
WORKSPACE="${WORKSPACE:-/workspace}"
TEMPLATE_DIR="$WORKSPACE/.lumio-template"
OUTPUT_DIR="$WORKSPACE/$PROJECT_NAME"

if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: bash scaffold-fast.sh PROJECT_NAME [MODULE_NAME]"
    exit 1
fi

echo "=== Fast Scaffold: $PROJECT_NAME ==="

# 0. Check if environment is prepared
if [ ! -f "$WORKSPACE/.lumio-prepared" ]; then
    echo "Environment not prepared. Running lumiovibe-prepare.sh..."
    bash /openhands/templates/lumiovibe-prepare.sh
fi

# Get deployer address from prepared state
DEPLOYER_ADDRESS=$(grep "Deployer Address:" "$WORKSPACE/.lumio-prepared" | awk '{print $3}')
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "ERROR: Could not get deployer address from prepared state"
    exit 1
fi

# 1. Create project structure from template
echo "[1/4] Creating project structure..."
mkdir -p "$OUTPUT_DIR/contract/sources"

# Copy Move.toml template and process
cp /openhands/templates/move/Move.toml.template "$OUTPUT_DIR/contract/Move.toml"
sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$OUTPUT_DIR/contract/Move.toml"
sed -i "s/{{DEPLOYER_ADDRESS}}/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/contract/Move.toml"

# Copy counter template and process
cp /openhands/templates/move/sources/counter.move.template "$OUTPUT_DIR/contract/sources/counter.move"
sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$OUTPUT_DIR/contract/sources/counter.move"

# Copy .gitignore
cp /openhands/templates/move/.gitignore "$OUTPUT_DIR/contract/" 2>/dev/null || true

# 2. Rename module if needed
echo "[2/4] Setting up module: $MODULE_NAME..."
if [ "$MODULE_NAME" != "counter" ]; then
    mv "$OUTPUT_DIR/contract/sources/counter.move" "$OUTPUT_DIR/contract/sources/$MODULE_NAME.move"
    sed -i "s/::counter/::$MODULE_NAME/g" "$OUTPUT_DIR/contract/sources/$MODULE_NAME.move"
fi

# 3. Quick compile to use cached framework
echo "[3/4] Compiling (using cached framework)..."
cd "$OUTPUT_DIR/contract"
COMPILE_OUT=$(lumio move compile --package-dir . 2>&1)
if echo "$COMPILE_OUT" | grep -qi "BUILDING\|Result"; then
    echo "✓ Compiled successfully!"
else
    echo "⚠ Compile issues (agent will fix):"
    echo "$COMPILE_OUT" | tail -5
fi
cd "$WORKSPACE"

# 4. Setup client and frontend directories
echo "[4/4] Setting up client and frontend..."
mkdir -p "$OUTPUT_DIR"/{client/src,client/tests,frontend/src}

# Copy client templates
cp -r /openhands/templates/client/* "$OUTPUT_DIR/client/" 2>/dev/null || true

# Copy frontend templates
cp -r /openhands/templates/frontend/* "$OUTPUT_DIR/frontend/" 2>/dev/null || true

# Create spec.md
cat > "$OUTPUT_DIR/spec.md" <<EOF
# $PROJECT_NAME

## Status
- [ ] Contract compiled
- [ ] Contract deployed
- [ ] Client created
- [ ] Frontend created

## Contract
Module: ${PROJECT_NAME}::${MODULE_NAME}
Deployer: (will be filled after deployment)

## Notes
Started from pre-compiled template.
Framework already cached.
EOF

echo ""
echo "✓ Project ready: $OUTPUT_DIR"
echo ""
echo "The contract is already compiled (framework cached)!"
echo "Next steps:"
echo "  1. Modify contract logic in contract/sources/$MODULE_NAME.move"
echo "  2. Recompile: cd $OUTPUT_DIR/contract && lumio move compile --package-dir ."
echo "  3. Deploy: lumio move publish --package-dir . --assume-yes"
echo ""
