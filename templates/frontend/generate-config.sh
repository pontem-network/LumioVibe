#!/bin/bash
# Generate frontend config files
# Usage: source this file, then call generate_frontend_config

generate_frontend_config() {
    local OUTPUT_DIR="$1"
    local PROJECT_NAME="$2"

    mkdir -p "$OUTPUT_DIR/frontend/src"/{types,hooks,pages,components}

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
    "preview": "vite preview"
  },
  "dependencies": {
    "@aptos-labs/ts-sdk": "^1.33.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
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
})
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
}
