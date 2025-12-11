---
name: frontend-template
type: knowledge
version: 3.0.0
agent: CodeActAgent
triggers:
- frontend
- react
- vite
- ui
- pontem
- wallet
---

# Frontend Template for Lumio dApps

## CRITICAL: Direct Pontem Wallet API

<IMPORTANT>
DO NOT use `@aptos-labs/wallet-adapter-react` or any wallet adapter libraries!
They have compatibility issues with Lumio Network.

Use **direct Pontem Wallet API** via `window.pontem`.
Docs: https://docs.pontemwallet.xyz/guide/api.html
</IMPORTANT>

## Project Structure

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── pontem.ts          # Complete Pontem types
    ├── hooks/
    │   ├── usePontem.ts       # Wallet connection hook
    │   └── useContract.ts     # Contract interaction hook
    └── pages/
        ├── Home.tsx
        └── Documentation.tsx
```

## Step 1: Copy from Templates

```bash
cp -r /openhands/templates/frontend/* ./frontend/
cd frontend
```

## Step 2: Update Placeholders

Replace in all files:
- `{{PROJECT_NAME}}` → your project name
- `{{CONTRACT_ADDRESS}}` → deployed contract address
- `{{MODULE_NAME}}` → your Move module name

## Step 3: Install & Run

```bash
pnpm install
pnpm dev --host --port $APP_PORT_1
```

<IMPORTANT>
⚠️ ALWAYS use `$APP_PORT_1` - this port is mapped from Docker to host!
⚠️ Start the server ONCE and NEVER restart - Vite HMR handles all changes automatically.
</IMPORTANT>

---

## Pontem Wallet API Reference

Based on official docs: https://docs.pontemwallet.xyz/guide/api.html

### Detecting Wallet

The wallet injects `window.pontem` after page load. Use the `pontemWalletInjected` event:

```typescript
// Wait for wallet injection
window.addEventListener('pontemWalletInjected', () => {
  console.log('Pontem is available:', window.pontem);
});

// Or check with delay fallback
if (window.pontem) {
  // Wallet ready
} else {
  setTimeout(() => {
    if (window.pontem) { /* ready */ }
  }, 500);
}
```

### Connection Methods

```typescript
// Connect - requests permission, returns address
const result = await window.pontem.connect();
// Returns: string (address) OR { address: string, publicKey: string }

// Check if connected
const isConnected = await window.pontem.isConnected();
// Returns: boolean

// Get current account
const address = await window.pontem.account();
// Returns: "0x..." (hex string)

// Disconnect
await window.pontem.disconnect();
```

### Network Methods

```typescript
// Get current network
const network = await window.pontem.network();
// Returns: { name: string, api: string, chainId: number }

// Get chain ID only
const chainId = await window.pontem.chainId();
// Returns: string (e.g., "2" for Lumio testnet)

// Switch network (prompts user)
await window.pontem.switchNetwork(2);  // 2 = Lumio Testnet
// Chain IDs: 1=Mainnet, 2=Testnet, 67=Devnet
```

### Transaction Methods

```typescript
// Sign and submit transaction
const { success, result } = await window.pontem.signAndSubmit({
  function: "0x1::module::function",
  arguments: ["arg1", "100"],  // ALL MUST BE STRINGS!
  type_arguments: []
});

// With gas options
const { success, result } = await window.pontem.signAndSubmit(
  {
    function: "0x123::counter::increment",
    arguments: ["1"],
    type_arguments: []
  },
  {
    max_gas_amount: "10000",
    gas_unit_price: "100"
  }
);

// Result structure
if (success) {
  console.log('TX Hash:', result.hash);
  console.log('Sender:', result.sender);
}
```

### Event Listeners

```typescript
// Listen for account changes
const unsubscribe = window.pontem.onChangeAccount((address) => {
  if (address) {
    console.log('Switched to:', address);
  } else {
    console.log('Disconnected');
  }
});

// Listen for network changes
const unsubscribe = window.pontem.onChangeNetwork((network) => {
  console.log('Network changed:', network.name, network.chainId);
});

// Cleanup
unsubscribe();
```

---

## TypeScript Types (types/pontem.ts)

```typescript
export interface PontemProvider {
  version: string;
  connect(): Promise<{ address: string; publicKey: string } | string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  publicKey(): Promise<string>;
  network(): Promise<PontemNetwork>;
  chainId(): Promise<string>;
  switchNetwork(chainId: number): Promise<boolean>;
  signAndSubmit(payload: PontemPayload, options?: PontemTxOptions): Promise<PontemTxResult>;
  onChangeAccount(callback: (address: string | undefined) => void): () => void;
  onChangeNetwork(callback: (network: PontemNetwork) => void): () => void;
}

export interface PontemNetwork {
  name: string;
  api: string;
  chainId: number;
}

export interface PontemPayload {
  function: string;      // "0xADDR::module::function"
  arguments: string[];   // ALL must be strings!
  type_arguments?: string[];
}

export interface PontemTxResult {
  success: boolean;
  result?: { hash: string; sender: string };
}

// Lumio constants
export const LUMIO_CHAIN_ID = 2;
export const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';

declare global {
  interface Window { pontem?: PontemProvider; }
  interface WindowEventMap { pontemWalletInjected: CustomEvent; }
}
```

---

## usePontem Hook

```typescript
import { useState, useEffect, useCallback } from 'react';
import { LUMIO_CHAIN_ID } from '../types/pontem';

export function usePontem() {
  const [pontem, setPontem] = useState(undefined);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setup = () => {
      if (window.pontem) {
        setPontem(window.pontem);
        // Setup listeners
        window.pontem.onChangeAccount((addr) => {
          setAccount(addr || null);
          setConnected(!!addr);
        });
        window.pontem.onChangeNetwork((net) => {
          setNetwork(net);
          if (net.chainId !== LUMIO_CHAIN_ID) {
            setError('Please switch to Lumio Testnet');
          }
        });
      }
    };

    setup();
    window.addEventListener('pontemWalletInjected', setup);
    return () => window.removeEventListener('pontemWalletInjected', setup);
  }, []);

  const connect = useCallback(async () => {
    if (!pontem) {
      setError('Install Pontem Wallet from pontem.network');
      return false;
    }
    const result = await pontem.connect();
    const addr = typeof result === 'string' ? result : result.address;
    setAccount(addr);
    setConnected(true);

    // Auto-switch to Lumio
    const net = await pontem.network();
    if (net.chainId !== LUMIO_CHAIN_ID) {
      await pontem.switchNetwork(LUMIO_CHAIN_ID);
    }
    return true;
  }, [pontem]);

  return { pontem, connected, account, network, error, connect };
}
```

---

## useContract Hook

```typescript
import { usePontem } from './usePontem';

const CONTRACT_ADDRESS = '{{CONTRACT_ADDRESS}}';
const MODULE_NAME = '{{MODULE_NAME}}';
const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';

export function useContract() {
  const { pontem, connected } = usePontem();

  // Entry function (modifies state, requires wallet)
  const callEntry = async (fn: string, args: any[] = []) => {
    if (!pontem || !connected) throw new Error('Wallet not connected');

    const { success, result } = await pontem.signAndSubmit({
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
      arguments: args.map(a => String(a)),  // MUST be strings!
      type_arguments: [],
    });

    if (!success) throw new Error('Transaction rejected');
    return result;
  };

  // View function (read-only, no wallet needed)
  const callView = async (fn: string, args: any[] = []) => {
    const res = await fetch(`${LUMIO_RPC}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
        type_arguments: [],
        arguments: args.map(a => String(a)),
      }),
    });
    const data = await res.json();
    return data[0];
  };

  return { callEntry, callView };
}
```

---

## CRITICAL Rules

### 1. Arguments MUST be strings

```typescript
// ✅ CORRECT
arguments: ["0x123...", "100", "true"]

// ❌ WRONG - will fail silently or throw
arguments: [0x123, 100, true]
```

Always use `args.map(a => String(a))` before passing to signAndSubmit.

### 2. Check Network Before Transactions

```typescript
const network = await window.pontem.network();
if (network.chainId !== 2) {  // 2 = Lumio Testnet
  await window.pontem.switchNetwork(2);
}
```

### 3. Handle Wallet Not Installed

```typescript
if (!window.pontem) {
  alert('Please install Pontem Wallet from pontem.network/pontem-wallet');
  return;
}
```

### 4. View Functions Don't Need Wallet

```typescript
// Direct RPC call - no wallet required
const response = await fetch('https://api.testnet.lumio.io/v1/view', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    function: "0x123::counter::get_value",
    type_arguments: [],
    arguments: ["0xabc..."],
  }),
});
```

### 5. Wait for Wallet Injection

```typescript
// ❌ WRONG: Accessing immediately
const pontem = window.pontem; // undefined on page load!

// ✅ CORRECT: Wait for injection event
useEffect(() => {
  const setup = () => {
    if (window.pontem) setPontem(window.pontem);
  };
  setup();
  window.addEventListener('pontemWalletInjected', setup);
  setTimeout(setup, 500); // Fallback for slow injection
  return () => window.removeEventListener('pontemWalletInjected', setup);
}, []);
```

### 6. NEVER Use Wallet Adapters

```typescript
// ❌ WRONG - compatibility issues with Lumio
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletProvider } from '@pontem/wallet-adapter-react';

// ✅ CORRECT - direct API only
const pontem = window.pontem;
await pontem.connect();
await pontem.signAndSubmit(payload);
```

---

## package.json (Minimal - NO wallet adapters!)

```json
{
  "dependencies": {
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
```

**NO wallet-adapter packages needed!**

---

## Key Points Summary

1. **Direct Pontem API only** - No wallet adapter libraries
2. **All args as strings** - `args.map(a => String(a))`
3. **Listen for injection** - Use `pontemWalletInjected` event
4. **Check/switch network** - Chain ID 2 for Lumio Testnet
5. **View via RPC** - Don't need wallet for reads
6. **Copy templates** - Don't write from scratch
7. **Use $APP_PORT_1** - Required for Docker port mapping
8. **Never restart Vite** - HMR handles all code changes
