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
echo "[1/3] Creating project structure..."
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
echo "[2/3] Setting up module: $MODULE_NAME..."
if [ "$MODULE_NAME" != "counter" ]; then
    mv "$OUTPUT_DIR/contract/sources/counter.move" "$OUTPUT_DIR/contract/sources/$MODULE_NAME.move"
    sed -i "s/::counter/::$MODULE_NAME/g" "$OUTPUT_DIR/contract/sources/$MODULE_NAME.move"
fi

# Quick compile to use cached framework
echo "Compiling (using cached framework)..."
cd "$OUTPUT_DIR/contract"
COMPILE_OUT=$(lumio move compile --package-dir . 2>&1)
if echo "$COMPILE_OUT" | grep -qi "BUILDING\|Result"; then
    echo "✓ Compiled successfully!"
else
    echo "⚠ Compile issues (agent will fix):"
    echo "$COMPILE_OUT" | tail -5
fi
cd "$WORKSPACE"

# 3. Setup frontend directory
echo "[3/3] Setting up frontend..."
mkdir -p "$OUTPUT_DIR/frontend/src"/{types,hooks,pages}

# Copy frontend templates
for file in /openhands/templates/frontend/*.template; do
    [ -f "$file" ] || continue
    base=$(basename "$file" .template)
    cp "$file" "$OUTPUT_DIR/frontend/$base"
    sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$OUTPUT_DIR/frontend/$base"
    sed -i "s/{{CONTRACT_ADDRESS}}/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/frontend/$base"
    sed -i "s/{{MODULE_NAME}}/$MODULE_NAME/g" "$OUTPUT_DIR/frontend/$base"
done

# Copy frontend src templates
for file in /openhands/templates/frontend/src/*.template; do
    [ -f "$file" ] || continue
    base=$(basename "$file" .template)
    cp "$file" "$OUTPUT_DIR/frontend/src/$base"
    sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$OUTPUT_DIR/frontend/src/$base"
    sed -i "s/{{CONTRACT_ADDRESS}}/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/frontend/src/$base"
    sed -i "s/{{MODULE_NAME}}/$MODULE_NAME/g" "$OUTPUT_DIR/frontend/src/$base"
done

# Copy types
for file in /openhands/templates/frontend/src/types/*.template; do
    [ -f "$file" ] || continue
    base=$(basename "$file" .template)
    cp "$file" "$OUTPUT_DIR/frontend/src/types/$base"
done

# Copy hooks
for file in /openhands/templates/frontend/src/hooks/*.template; do
    [ -f "$file" ] || continue
    base=$(basename "$file" .template)
    cp "$file" "$OUTPUT_DIR/frontend/src/hooks/$base"
    sed -i "s/{{CONTRACT_ADDRESS}}/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/frontend/src/hooks/$base"
    sed -i "s/{{MODULE_NAME}}/$MODULE_NAME/g" "$OUTPUT_DIR/frontend/src/hooks/$base"
done

# Copy pages
for file in /openhands/templates/frontend/src/pages/*.template; do
    [ -f "$file" ] || continue
    base=$(basename "$file" .template)
    cp "$file" "$OUTPUT_DIR/frontend/src/pages/$base"
    sed -i "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$OUTPUT_DIR/frontend/src/pages/$base"
    sed -i "s/{{CONTRACT_ADDRESS}}/$DEPLOYER_ADDRESS/g" "$OUTPUT_DIR/frontend/src/pages/$base"
    sed -i "s/{{MODULE_NAME}}/$MODULE_NAME/g" "$OUTPUT_DIR/frontend/src/pages/$base"
done

# Create spec.md
cat > "$OUTPUT_DIR/spec.md" <<EOF
# $PROJECT_NAME

## Status
- [ ] Contract compiled
- [ ] Contract deployed
- [ ] Frontend created

## Contract
Module: ${PROJECT_NAME}::${MODULE_NAME}
Deployer: $DEPLOYER_ADDRESS

## Notes
Started from pre-compiled template.
Framework already cached.
EOF

echo ""
echo "✓ Project ready: $OUTPUT_DIR"
echo ""
echo "Deployer address: $DEPLOYER_ADDRESS"
echo ""
echo "Next steps:"
echo "  1. Modify contract logic in contract/sources/$MODULE_NAME.move"
echo "  2. Recompile: cd $OUTPUT_DIR/contract && lumio move compile --package-dir ."
echo "  3. Deploy: lumio move publish --package-dir . --assume-yes"
echo "  4. Update CONTRACT_ADDRESS in frontend/src/hooks/useContract.ts"
echo "  5. Build frontend: cd $OUTPUT_DIR/frontend && pnpm install && pnpm build"
echo ""
