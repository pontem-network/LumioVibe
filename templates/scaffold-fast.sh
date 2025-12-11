#!/bin/bash
# LumioVibe Fast Scaffold - Single script to setup everything
# Usage: bash scaffold-fast.sh PROJECT_NAME

set -e

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
# STEP 1: Initialize Lumio CLI if needed
# ============================================
log_info "Step 1/5: Checking Lumio CLI..."

LUMIO_CONFIG="$WORKSPACE/.lumio/config.yaml"
DEPLOYER_ADDRESS=""
PRIVATE_KEY=""

if [ -f "$LUMIO_CONFIG" ]; then
    log_info "Lumio config exists, getting address..."
    DEPLOYER_ADDRESS=$($LUMIO_BIN account list 2>/dev/null | grep -E "Account Address:|account:" | head -1 | awk '{print $NF}' | tr -d '"')
fi

if [ -z "$DEPLOYER_ADDRESS" ]; then
    log_info "Initializing new Lumio account..."
    cd "$WORKSPACE"

    # lumio init creates account automatically
    $LUMIO_BIN init --assume-yes --network testnet 2>&1 || true

    # Get the address
    DEPLOYER_ADDRESS=$($LUMIO_BIN account list 2>/dev/null | grep -E "Account Address:|account:" | head -1 | awk '{print $NF}' | tr -d '"')

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log_error "Failed to get deployer address. Output of 'lumio account list':"
        $LUMIO_BIN account list
        exit 1
    fi
fi

# Ensure address has 0x prefix
if [[ ! "$DEPLOYER_ADDRESS" =~ ^0x ]]; then
    DEPLOYER_ADDRESS="0x$DEPLOYER_ADDRESS"
fi

# Extract private key from config for test mode
if [ -f "$LUMIO_CONFIG" ]; then
    PRIVATE_KEY=$(grep -A1 "private_key:" "$LUMIO_CONFIG" 2>/dev/null | tail -1 | tr -d ' "' || true)
    if [ -z "$PRIVATE_KEY" ]; then
        # Try alternate format
        PRIVATE_KEY=$(grep "private_key:" "$LUMIO_CONFIG" 2>/dev/null | head -1 | awk '{print $2}' | tr -d '"' || true)
    fi
fi

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
    log_warn "Directory $OUTPUT_DIR already exists"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Aborted"
        exit 1
    fi
    rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR/contract/sources"
mkdir -p "$OUTPUT_DIR/frontend/src"/{types,hooks,pages,components}

# ============================================
# STEP 4: Create Move contract
# ============================================
log_info "Step 4/5: Creating Move contract..."

# Move.toml
cat > "$OUTPUT_DIR/contract/Move.toml" <<EOF
[package]
name = "$PROJECT_NAME"
version = "1.0.0"
authors = []

[addresses]
$PROJECT_NAME = "$DEPLOYER_ADDRESS"

[dependencies.LumioFramework]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "lumio-framework"

[dependencies.LumioStdlib]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "lumio-stdlib"

[dependencies.MoveStdlib]
git = "https://github.com/pontem-network/lumio-framework"
rev = "mainnet"
subdir = "move-stdlib"
EOF

# Counter contract
cat > "$OUTPUT_DIR/contract/sources/counter.move" <<EOF
module ${PROJECT_NAME}::counter {
    use std::signer;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;

    struct Counter has key {
        value: u64,
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Counter>(addr), E_ALREADY_INITIALIZED);
        move_to(account, Counter { value: 0 });
    }

    public entry fun increment(account: &signer) acquires Counter {
        let addr = signer::address_of(account);
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        let counter = borrow_global_mut<Counter>(addr);
        counter.value = counter.value + 1;
    }

    #[view]
    public fun get_value(addr: address): u64 acquires Counter {
        assert!(exists<Counter>(addr), E_NOT_INITIALIZED);
        borrow_global<Counter>(addr).value
    }

    #[view]
    public fun exists_at(addr: address): bool {
        exists<Counter>(addr)
    }
}
EOF

# .gitignore
cat > "$OUTPUT_DIR/contract/.gitignore" <<EOF
build/
.aptos/
EOF

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

# src/types/pontem.ts
cat > "$OUTPUT_DIR/frontend/src/types/pontem.ts" <<EOF
export interface PontemProvider {
  version: string;
  connect(): Promise<{ address: string; publicKey: string } | string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  network(): Promise<PontemNetwork>;
  signAndSubmit(payload: PontemPayload, options?: PontemTxOptions): Promise<PontemTxResult>;
  onChangeAccount(callback: (address: string | undefined) => void): () => void;
  onChangeNetwork(callback: (network: PontemNetwork) => void): () => void;
  switchNetwork(chainId: number): Promise<boolean>;
}

export interface PontemNetwork {
  name: string;
  api: string;
  chainId: number;
}

export interface PontemPayload {
  function: string;
  arguments: string[];
  type_arguments?: string[];
}

export interface PontemTxOptions {
  max_gas_amount?: string;
  gas_unit_price?: string;
}

export interface PontemTxResult {
  success: boolean;
  result?: { hash: string; sender: string };
}

export const LUMIO_CHAIN_ID = 2;
export const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';

export const IS_TEST_MODE = import.meta.env.VITE_WALLET_MODE === 'test';
export const TEST_PRIVATE_KEY = '$PRIVATE_KEY';
export const TEST_ADDRESS = '$DEPLOYER_ADDRESS';

declare global {
  interface Window { pontem?: PontemProvider; }
  interface WindowEventMap { pontemWalletInjected: CustomEvent; }
}

export {};
EOF

# src/hooks/usePontem.ts
cat > "$OUTPUT_DIR/frontend/src/hooks/usePontem.ts" <<EOF
import { useState, useEffect, useCallback } from 'react';
import type { PontemProvider, PontemNetwork } from '../types/pontem';
import { LUMIO_CHAIN_ID, IS_TEST_MODE, TEST_ADDRESS } from '../types/pontem';

export function usePontem() {
  const [pontem, setPontem] = useState<PontemProvider | undefined>(undefined);
  const [connected, setConnected] = useState(IS_TEST_MODE);
  const [account, setAccount] = useState<string | null>(IS_TEST_MODE ? TEST_ADDRESS : null);
  const [network, setNetwork] = useState<PontemNetwork | null>(
    IS_TEST_MODE ? { name: 'Lumio Testnet', api: 'https://api.testnet.lumio.io/v1', chainId: 2 } : null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_TEST_MODE) return;

    const setup = () => {
      if (typeof window !== 'undefined' && window.pontem) {
        setPontem(window.pontem);
        window.pontem.isConnected().then(isConn => {
          if (isConn) {
            window.pontem!.account().then(setAccount);
            window.pontem!.network().then(setNetwork);
            setConnected(true);
          }
        });
        window.pontem.onChangeAccount((addr) => {
          setAccount(addr || null);
          setConnected(!!addr);
        });
        window.pontem.onChangeNetwork((net) => {
          setNetwork(net);
          if (net.chainId !== LUMIO_CHAIN_ID) {
            setError('Please switch to Lumio Testnet');
          } else {
            setError(null);
          }
        });
      }
    };
    setup();
    window.addEventListener('pontemWalletInjected', setup);
    const timeout = setTimeout(setup, 500);
    return () => {
      window.removeEventListener('pontemWalletInjected', setup);
      clearTimeout(timeout);
    };
  }, []);

  const connect = useCallback(async () => {
    if (IS_TEST_MODE) {
      setConnected(true);
      setAccount(TEST_ADDRESS);
      return true;
    }
    if (!pontem) {
      setError('Install Pontem Wallet from pontem.network');
      return false;
    }
    try {
      const result = await pontem.connect();
      const addr = typeof result === 'string' ? result : result.address;
      setAccount(addr);
      setConnected(true);
      const net = await pontem.network();
      setNetwork(net);
      if (net.chainId !== LUMIO_CHAIN_ID) {
        try { await pontem.switchNetwork(LUMIO_CHAIN_ID); }
        catch { setError('Please switch to Lumio Testnet'); }
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      return false;
    }
  }, [pontem]);

  const disconnect = useCallback(async () => {
    if (IS_TEST_MODE) {
      setConnected(false);
      setAccount(null);
      return;
    }
    if (pontem) {
      await pontem.disconnect();
      setAccount(null);
      setConnected(false);
    }
  }, [pontem]);

  return {
    pontem,
    connected,
    account,
    network,
    error,
    connect,
    disconnect,
    isInstalled: IS_TEST_MODE || !!pontem,
    isTestMode: IS_TEST_MODE,
  };
}
EOF

# src/hooks/useContract.ts
cat > "$OUTPUT_DIR/frontend/src/hooks/useContract.ts" <<EOF
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const CONTRACT_ADDRESS = '$DEPLOYER_ADDRESS';
const MODULE_NAME = 'counter';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

export function useContract() {
  const { pontem, connected, account, isTestMode } = usePontem();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const testAccountRef = useRef<Account | null>(null);

  useEffect(() => {
    if (IS_TEST_MODE && TEST_PRIVATE_KEY) {
      try {
        const privateKey = new Ed25519PrivateKey(TEST_PRIVATE_KEY);
        testAccountRef.current = Account.fromPrivateKey({ privateKey });
      } catch (e) {
        console.error('Failed to create test account:', e);
      }
    }
  }, []);

  const callEntryTest = useCallback(async (fn: string, args: (string | number)[] = []) => {
    if (!testAccountRef.current) {
      setError('Test account not initialized');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const tx = await aptos.transaction.build.simple({
        sender: testAccountRef.current.accountAddress,
        data: {
          function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
          functionArguments: args.map(a => String(a)),
        },
      });
      const signed = await aptos.transaction.sign({ signer: testAccountRef.current, transaction: tx });
      const submitted = await aptos.transaction.submit.simple({ senderAuthenticator: signed, transaction: tx });
      const result = await aptos.waitForTransaction({ transactionHash: submitted.hash });
      return { hash: submitted.hash, success: result.success };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const callEntryPontem = useCallback(async (fn: string, args: (string | number)[] = []) => {
    if (!pontem || !connected) { setError('Wallet not connected'); return null; }
    setLoading(true);
    setError(null);
    try {
      const { success, result } = await pontem.signAndSubmit({
        function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
        arguments: args.map(a => String(a)),
        type_arguments: [],
      });
      if (!success) throw new Error('Transaction rejected');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pontem, connected]);

  const callEntry = useCallback(async (fn: string, args: (string | number)[] = []) => {
    return IS_TEST_MODE ? callEntryTest(fn, args) : callEntryPontem(fn, args);
  }, [callEntryTest, callEntryPontem]);

  const callView = useCallback(async <T>(fn: string, args: (string | number)[] = []): Promise<T | null> => {
    try {
      const res = await fetch(\`\${LUMIO_RPC}/view\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
          type_arguments: [],
          arguments: args.map(a => String(a)),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data[0] as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'View failed');
      return null;
    }
  }, []);

  const initialize = useCallback(() => callEntry('initialize'), [callEntry]);
  const increment = useCallback(() => callEntry('increment'), [callEntry]);
  const getCount = useCallback((addr: string) => callView<number>('get_value', [addr]), [callView]);
  const isInitialized = useCallback((addr: string) => callView<boolean>('exists_at', [addr]), [callView]);

  return {
    initialize, increment, getCount, isInitialized,
    callEntry, callView, loading, error, account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
EOF

# src/App.tsx
cat > "$OUTPUT_DIR/frontend/src/App.tsx" <<EOF
import { Routes, Route, Link } from 'react-router-dom';
import { usePontem } from './hooks/usePontem';
import Home from './pages/Home';
import Documentation from './pages/Documentation';

export default function App() {
  const { connected, account, connect, disconnect, isInstalled, isTestMode } = usePontem();

  return (
    <div className="min-h-screen bg-gray-900">
      {isTestMode && (
        <div className="bg-yellow-600 text-black text-center py-1 text-sm font-medium">
          TEST MODE - Transactions signed with test private key (no wallet needed)
        </div>
      )}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-purple-400">$PROJECT_NAME</h1>
            <div className="flex gap-4">
              <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
              <Link to="/docs" className="text-gray-300 hover:text-white">Docs</Link>
            </div>
          </div>
          <div>
            {isTestMode ? (
              <div className="flex items-center gap-4">
                <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">TEST</span>
                <span className="text-sm text-gray-400">{account?.slice(0,6)}...{account?.slice(-4)}</span>
              </div>
            ) : !isInstalled ? (
              <a href="https://pontem.network/pontem-wallet" target="_blank" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
                Get Pontem Wallet
              </a>
            ) : connected ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{account?.slice(0,6)}...{account?.slice(-4)}</span>
                <button onClick={disconnect} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg">Disconnect</button>
              </div>
            ) : (
              <button onClick={connect} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">Connect Wallet</button>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Documentation />} />
        </Routes>
      </main>
    </div>
  );
}
EOF

# src/pages/Home.tsx
cat > "$OUTPUT_DIR/frontend/src/pages/Home.tsx" <<EOF
import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract } from '../hooks/useContract';

export default function Home() {
  const { connected, account, error: walletError, isInstalled, isTestMode } = usePontem();
  const { initialize, increment, getCount, isInitialized, loading, error: txError, contractAddress } = useContract();
  const [initialized, setInitialized] = useState(false);
  const [count, setCount] = useState<number>(0);

  useEffect(() => { if (account) refreshData(); }, [account]);

  const refreshData = async () => {
    if (!account) return;
    const isInit = await isInitialized(account);
    setInitialized(!!isInit);
    if (isInit) {
      const c = await getCount(account);
      if (c !== null) setCount(c);
    }
  };

  const handleInitialize = async () => { if (await initialize()) setTimeout(refreshData, 2000); };
  const handleIncrement = async () => { if (await increment()) setTimeout(refreshData, 2000); };

  if (!isInstalled && !isTestMode) return (
    <div className="text-center py-20">
      <h2 className="text-3xl font-bold mb-4">Welcome to $PROJECT_NAME</h2>
      <p className="text-gray-400 mb-8">Install Pontem Wallet to interact with this dApp</p>
      <a href="https://pontem.network/pontem-wallet" target="_blank" className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-lg font-medium">Get Pontem Wallet</a>
    </div>
  );

  if (!connected && !isTestMode) return (
    <div className="text-center py-20">
      <h2 className="text-3xl font-bold mb-4">Welcome to $PROJECT_NAME</h2>
      <p className="text-gray-400 mb-8">Connect your wallet to get started</p>
      {walletError && <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 max-w-md mx-auto"><p className="text-red-300">{walletError}</p></div>}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">$PROJECT_NAME</h2>
        {(txError || walletError) && <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6"><p className="text-red-300">{txError || walletError}</p></div>}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <span className="text-gray-300">Status</span>
            <span className={initialized ? 'text-green-400' : 'text-yellow-400'}>{initialized ? 'Initialized' : 'Not Initialized'}</span>
          </div>
          {initialized && (
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Counter Value</span>
              <span className="text-2xl font-bold text-purple-400">{count}</span>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {!initialized ? (
            <button onClick={handleInitialize} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-4 rounded-lg font-medium">{loading ? 'Processing...' : 'Initialize Contract'}</button>
          ) : (
            <div className="flex gap-4">
              <button onClick={handleIncrement} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-4 rounded-lg font-medium">{loading ? 'Processing...' : 'Increment'}</button>
              <button onClick={refreshData} disabled={loading} className="bg-gray-600 hover:bg-gray-700 px-6 py-4 rounded-lg font-medium">Refresh</button>
            </div>
          )}
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Contract Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Network</span><span className="text-purple-400">Lumio Testnet</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Address</span><span className="text-gray-300 font-mono text-xs break-all">{contractAddress}</span></div>
        </div>
      </div>
    </div>
  );
}
EOF

# src/pages/Documentation.tsx
cat > "$OUTPUT_DIR/frontend/src/pages/Documentation.tsx" <<EOF
export default function Documentation() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">$PROJECT_NAME Documentation</h1>
        <p className="text-gray-400">Smart contract deployed on Lumio Testnet</p>
      </div>
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-purple-400">Entry Functions</h2>
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-mono text-green-400 mb-2">initialize()</h3>
            <p className="text-gray-300 text-sm">Creates a Counter resource for your account.</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-mono text-green-400 mb-2">increment()</h3>
            <p className="text-gray-300 text-sm">Increments your counter by 1.</p>
          </div>
        </div>
      </section>
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-purple-400">View Functions</h2>
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-mono text-blue-400 mb-2">get_value(addr: address) -&gt; u64</h3>
            <p className="text-gray-300 text-sm">Returns the current counter value.</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-mono text-blue-400 mb-2">exists_at(addr: address) -&gt; bool</h3>
            <p className="text-gray-300 text-sm">Checks if counter is initialized.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
EOF

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

### Run frontend
\`\`\`bash
cd $OUTPUT_DIR/frontend
pnpm install
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
echo "  4. cd ../frontend && pnpm install && pnpm dev --host"
echo ""
