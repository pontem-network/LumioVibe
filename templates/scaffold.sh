#!/bin/bash

set -e

PROJECT_NAME="${1:-my_project}"
MODULE_NAME="${2:-main}"
CONTRACT_ADDRESS="${3:-_}"
DEV_ADDRESS="${4:-0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${5:-./$PROJECT_NAME}"

to_pascal_case() {
    echo "$1" | awk -F'_' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)} 1' OFS=''
}

CAPITALIZED_NAME=$(to_pascal_case "$PROJECT_NAME")
RESOURCE_NAME="${CAPITALIZED_NAME}Resource"
EVENT_NAME="${CAPITALIZED_NAME}Event"
CLIENT_CLASS_NAME="${CAPITALIZED_NAME}Client"

echo "Creating project: $PROJECT_NAME"
echo "Module name: $MODULE_NAME"
echo "Output directory: $OUTPUT_DIR"
echo "Resource name: $RESOURCE_NAME"
echo "Client class: $CLIENT_CLASS_NAME"

mkdir -p "$OUTPUT_DIR"/{contract/sources,contract/scripts,contract/tests,client/src,client/tests,frontend/src/{components,hooks,pages}}

replace_placeholders() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' \
            -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
            -e "s/{{MODULE_NAME}}/$MODULE_NAME/g" \
            -e "s/{{CONTRACT_ADDRESS}}/$CONTRACT_ADDRESS/g" \
            -e "s/{{DEV_ADDRESS}}/$DEV_ADDRESS/g" \
            -e "s/{{RESOURCE_NAME}}/$RESOURCE_NAME/g" \
            -e "s/{{EVENT_NAME}}/$EVENT_NAME/g" \
            -e "s/{{CLIENT_CLASS_NAME}}/$CLIENT_CLASS_NAME/g" \
            -e "s/{{PROJECT_DESCRIPTION}}/A smart contract for $PROJECT_NAME on Lumio Network/g" \
            "$file"
    else
        sed -i \
            -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
            -e "s/{{MODULE_NAME}}/$MODULE_NAME/g" \
            -e "s/{{CONTRACT_ADDRESS}}/$CONTRACT_ADDRESS/g" \
            -e "s/{{DEV_ADDRESS}}/$DEV_ADDRESS/g" \
            -e "s/{{RESOURCE_NAME}}/$RESOURCE_NAME/g" \
            -e "s/{{EVENT_NAME}}/$EVENT_NAME/g" \
            -e "s/{{CLIENT_CLASS_NAME}}/$CLIENT_CLASS_NAME/g" \
            -e "s/{{PROJECT_DESCRIPTION}}/A smart contract for $PROJECT_NAME on Lumio Network/g" \
            "$file"
    fi
}

echo "Copying Move templates..."
cp "$SCRIPT_DIR/move/Move.toml.template" "$OUTPUT_DIR/contract/Move.toml"
cp "$SCRIPT_DIR/move/sources/main.move.template" "$OUTPUT_DIR/contract/sources/$MODULE_NAME.move"
cp "$SCRIPT_DIR/move/.gitignore" "$OUTPUT_DIR/contract/.gitignore" 2>/dev/null || true

echo "Copying client templates..."
cp "$SCRIPT_DIR/client/package.json.template" "$OUTPUT_DIR/client/package.json"
cp "$SCRIPT_DIR/client/tsconfig.json.template" "$OUTPUT_DIR/client/tsconfig.json"
cp "$SCRIPT_DIR/client/src/index.ts.template" "$OUTPUT_DIR/client/src/index.ts"
cp "$SCRIPT_DIR/client/src/client.ts.template" "$OUTPUT_DIR/client/src/client.ts"
cp "$SCRIPT_DIR/client/src/types.ts.template" "$OUTPUT_DIR/client/src/types.ts"
cp "$SCRIPT_DIR/client/tests/contract.test.ts.template" "$OUTPUT_DIR/client/tests/contract.test.ts"

echo "Copying frontend templates..."
cp "$SCRIPT_DIR/frontend/package.json.template" "$OUTPUT_DIR/frontend/package.json"
cp "$SCRIPT_DIR/frontend/vite.config.ts.template" "$OUTPUT_DIR/frontend/vite.config.ts"
cp "$SCRIPT_DIR/frontend/tsconfig.json.template" "$OUTPUT_DIR/frontend/tsconfig.json"
cp "$SCRIPT_DIR/frontend/tailwind.config.js.template" "$OUTPUT_DIR/frontend/tailwind.config.js"
cp "$SCRIPT_DIR/frontend/postcss.config.js.template" "$OUTPUT_DIR/frontend/postcss.config.js"
cp "$SCRIPT_DIR/frontend/index.html.template" "$OUTPUT_DIR/frontend/index.html"
cp "$SCRIPT_DIR/frontend/src/index.css.template" "$OUTPUT_DIR/frontend/src/index.css"
cp "$SCRIPT_DIR/frontend/src/main.tsx.template" "$OUTPUT_DIR/frontend/src/main.tsx"
cp "$SCRIPT_DIR/frontend/src/App.tsx.template" "$OUTPUT_DIR/frontend/src/App.tsx"
cp "$SCRIPT_DIR/frontend/src/hooks/useContract.ts.template" "$OUTPUT_DIR/frontend/src/hooks/useContract.ts"
cp "$SCRIPT_DIR/frontend/src/pages/Home.tsx.template" "$OUTPUT_DIR/frontend/src/pages/Home.tsx"
cp "$SCRIPT_DIR/frontend/src/pages/Documentation.tsx.template" "$OUTPUT_DIR/frontend/src/pages/Documentation.tsx"

echo "Replacing placeholders..."
find "$OUTPUT_DIR" -type f \( -name "*.toml" -o -name "*.move" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.html" -o -name "*.js" -o -name "*.css" \) | while read file; do
    replace_placeholders "$file"
done

echo ""
echo "Project created successfully at: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. cd $OUTPUT_DIR/contract && lumio move compile"
echo "  2. cd $OUTPUT_DIR/client && pnpm install && pnpm test"
echo "  3. cd $OUTPUT_DIR/frontend && pnpm install && pnpm dev"
