#!/bin/bash
# Generate frontend config files
# Usage: source this file, then call generate_frontend_config

generate_frontend_config() {
    local OUTPUT_DIR="$1"
    local PROJECT_NAME="$2"

    mkdir -p "$OUTPUT_DIR/frontend/src"/{types,hooks,pages,components,utils,test}

    # package.json
    cat > "$OUTPUT_DIR/frontend/package.json" <<EOF
{
  "name": "${PROJECT_NAME}-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:test": "VITE_WALLET_MODE=test vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "start:prod": "kill \$(lsof -t -i:\$APP_PORT_1) 2>/dev/null || true; vite --host --port \$APP_PORT_1 --strictPort",
    "start:test": "kill \$(lsof -t -i:\$APP_PORT_2) 2>/dev/null || true; VITE_WALLET_MODE=test vite --host --port \$APP_PORT_2 --strictPort"
  },
  "dependencies": {
    "@aptos-labs/ts-sdk": "^1.33.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^1.3.1"
  }
}
EOF

    # index.html
    cat > "$OUTPUT_DIR/frontend/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$PROJECT_NAME - Lumio dApp</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

    # vite.config.ts
    cat > "$OUTPUT_DIR/frontend/vite.config.ts" <<EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
EOF

    # Test setup
    cat > "$OUTPUT_DIR/frontend/src/test/setup.ts" <<EOF
import '@testing-library/jest-dom';
EOF

    # Utils for testing (decimal conversion etc)
    cat > "$OUTPUT_DIR/frontend/src/utils/decimals.ts" <<EOF
// Lumio uses 8 decimals like Aptos
export const DECIMALS = 8;
export const MULTIPLIER = 100000000; // 10^8

// Convert human-readable amount to chain units (smallest units)
export function toChainUnits(humanAmount: number): bigint {
  return BigInt(Math.round(humanAmount * MULTIPLIER));
}

// Convert chain units to human-readable amount
export function toHumanUnits(chainUnits: bigint | number): number {
  return Number(chainUnits) / MULTIPLIER;
}

// Format for display with specified decimal places
export function formatAmount(chainUnits: bigint | number, decimals: number = 4): string {
  const human = toHumanUnits(chainUnits);
  return human.toFixed(decimals);
}
EOF

    # Test file for decimals utility
    cat > "$OUTPUT_DIR/frontend/src/utils/decimals.test.ts" <<EOF
import { describe, it, expect } from 'vitest';
import { toChainUnits, toHumanUnits, formatAmount, MULTIPLIER } from './decimals';

describe('decimal conversions', () => {
  it('converts 1 human unit to correct chain units', () => {
    expect(toChainUnits(1)).toBe(BigInt(MULTIPLIER));
  });

  it('converts fractional human units correctly', () => {
    expect(toChainUnits(1.5)).toBe(BigInt(150000000));
    expect(toChainUnits(0.00000001)).toBe(BigInt(1));
  });

  it('converts chain units to human units', () => {
    expect(toHumanUnits(BigInt(MULTIPLIER))).toBe(1);
    expect(toHumanUnits(BigInt(150000000))).toBe(1.5);
  });

  it('handles zero correctly', () => {
    expect(toChainUnits(0)).toBe(BigInt(0));
    expect(toHumanUnits(BigInt(0))).toBe(0);
  });

  it('formats amount with default decimals', () => {
    expect(formatAmount(BigInt(123456789))).toBe('1.2346');
  });

  it('formats amount with custom decimals', () => {
    expect(formatAmount(BigInt(123456789), 2)).toBe('1.23');
  });

  // ⚠️ ADD YOUR CONTRACT-SPECIFIC TESTS BELOW!
  // Example for staking:
  // it('calculates reward correctly', () => {
  //   const staked = toChainUnits(100);
  //   const rewardRate = 0.1; // 10%
  //   const expectedReward = toChainUnits(10);
  //   expect(calculateReward(staked, rewardRate)).toBe(expectedReward);
  // });
});
EOF

    # tsconfig.json
    cat > "$OUTPUT_DIR/frontend/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
EOF

    # tailwind.config.js
    cat > "$OUTPUT_DIR/frontend/tailwind.config.js" <<EOF
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'lumio-primary': '#8B5CF6',
        'lumio-dark': '#1a1a2e',
      },
    },
  },
  plugins: [],
}
EOF

    # postcss.config.js
    cat > "$OUTPUT_DIR/frontend/postcss.config.js" <<EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

    # src/index.css
    cat > "$OUTPUT_DIR/frontend/src/index.css" <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900 text-white;
}
EOF

    # src/main.tsx
    cat > "$OUTPUT_DIR/frontend/src/main.tsx" <<EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
EOF

    # src/vite-env.d.ts
    cat > "$OUTPUT_DIR/frontend/src/vite-env.d.ts" <<EOF
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
EOF

    # start.sh - ONLY way to run frontend
    cat > "$OUTPUT_DIR/frontend/start.sh" <<'STARTSCRIPT'
#!/bin/bash
# Frontend start script - ALWAYS use this to run the frontend
# Usage: ./start.sh [--test]

set -e

if [ -z "$APP_PORT_1" ]; then
    echo "ERROR: APP_PORT_1 environment variable is not set!"
    echo "This script must be run inside LumioVibe runtime."
    exit 1
fi

PORT="$APP_PORT_1"
MODE=""

if [ "$1" = "--test" ] || [ "$1" = "-t" ]; then
    MODE="test"
    echo "Starting frontend in TEST mode (no wallet required)..."
else
    echo "Starting frontend in PRODUCTION mode (Pontem Wallet required)..."
fi

# Kill any process on APP_PORT_1
echo "Killing any process on port $PORT..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
sleep 1

# Double check port is free
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "ERROR: Port $PORT is still in use!"
    lsof -i:$PORT
    exit 1
fi

echo "Starting on port $PORT..."

if [ "$MODE" = "test" ]; then
    VITE_WALLET_MODE=test exec pnpm vite --host --port $PORT --strictPort
else
    exec pnpm vite --host --port $PORT --strictPort
fi
STARTSCRIPT
    chmod +x "$OUTPUT_DIR/frontend/start.sh"
}
