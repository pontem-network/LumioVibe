---
name: frontend-template
type: knowledge
version: 2.0.0
agent: CodeActAgent
triggers:
- frontend
- react
- vite
- ui
---

# Frontend Template for Lumio dApps

## IMPORTANT: Use Direct Pontem API

Do NOT use `@aptos-labs/wallet-adapter-react`. It has compatibility issues with Lumio.

Instead, use **direct Pontem Wallet API** via `window.pontem`. This is simpler and more reliable.

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
    │   └── pontem.ts          # Pontem types declaration
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
pnpm dev --host
```

## Key Files Explained

### types/pontem.ts - TypeScript Types

```typescript
export interface PontemProvider {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  network(): Promise<{ api: string; chainId: number }>;
  signAndSubmit(payload: PontemPayload): Promise<PontemTxResult>;
}

export interface PontemPayload {
  function: string;                              // "0xADDR::module::function"
  arguments: (string | number | Uint8Array)[];  // ALL must be strings!
  type_arguments?: string[];                    // For generic types
}

export interface PontemTxResult {
  success: boolean;
  result?: { hash: string };
}

declare global {
  interface Window {
    pontem?: PontemProvider;
  }
}
```

### hooks/usePontem.ts - Wallet Connection

```typescript
import { useState, useEffect, useCallback } from 'react';

export function usePontem() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pontem = typeof window !== 'undefined' ? window.pontem : undefined;

  useEffect(() => {
    // Check existing connection on mount
    if (pontem) {
      pontem.isConnected().then(isConn => {
        if (isConn) {
          pontem.account().then(addr => {
            setAccount(addr);
            setConnected(true);
          });
        }
      });
    }
  }, []);

  const connect = useCallback(async () => {
    if (!pontem) {
      setError('Install Pontem Wallet from pontem.network');
      return false;
    }
    try {
      const addr = await pontem.connect();
      setAccount(addr);
      setConnected(true);

      // Verify network
      const network = await pontem.network();
      if (!network.api?.includes('lumio')) {
        setError('Switch to Lumio Testnet in Pontem');
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      return false;
    }
  }, [pontem]);

  const disconnect = useCallback(async () => {
    if (pontem) {
      await pontem.disconnect();
      setAccount(null);
      setConnected(false);
    }
  }, [pontem]);

  return { connected, account, connect, disconnect, error, isInstalled: !!pontem };
}
```

### hooks/useContract.ts - Contract Calls

```typescript
import { useState, useCallback } from 'react';
import { usePontem } from './usePontem';

// === LUMIO NETWORK CONSTANTS - DO NOT CHANGE ===
const LUMIO_CHAIN_ID = 2;  // CRITICAL: Always 2 for Lumio!
const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';  // NOT aptos URLs!

const CONTRACT_ADDRESS = '0x...';  // Replace with actual
const MODULE_NAME = 'counter';     // Replace with actual

export function useContract() {
  const { pontem, connected, account } = usePontem();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entry function (modifies state, requires wallet)
  const callEntry = useCallback(async (
    fn: string,
    args: (string | number)[] = []
  ) => {
    if (!pontem || !connected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { success, result } = await pontem.signAndSubmit({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
        arguments: args.map(a => String(a)),  // MUST be strings!
        type_arguments: [],
      });

      if (!success) throw new Error('Transaction rejected');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pontem, connected]);

  // View function (read-only, no wallet needed)
  const callView = useCallback(async <T>(
    fn: string,
    args: (string | number)[] = []
  ): Promise<T | null> => {
    try {
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
      return data[0] as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'View failed');
      return null;
    }
  }, []);

  return { callEntry, callView, loading, error, account };
}
```

## Common Transaction Patterns

### Initialize Contract

```typescript
const handleInit = async () => {
  const result = await callEntry('initialize');
  if (result) {
    // Wait for chain, then refresh
    setTimeout(refreshData, 2000);
  }
};
```

### Call with Arguments

```typescript
// IMPORTANT: All arguments must be strings!
const handleTransfer = async (to: string, amount: number) => {
  const result = await callEntry('transfer', [to, amount]);
  // amount will be converted to "100" string inside callEntry
};
```

### Read View Function

```typescript
const fetchBalance = async () => {
  const balance = await callView<number>('get_balance', [account]);
  setBalance(balance ?? 0);
};
```

## CRITICAL: Argument Format

Pontem Wallet requires ALL arguments as **strings**:

```typescript
// ✅ CORRECT
arguments: ["0x123...", "100", "true"]

// ❌ WRONG - will fail
arguments: [0x123, 100, true]
```

The `useContract` hook handles this automatically with `args.map(a => String(a))`.

## Error Handling Patterns

```tsx
{error && (
  <div className="bg-red-900/50 border border-red-500 rounded p-4">
    <p className="text-red-300">{error}</p>
  </div>
)}
```

## package.json (Minimal Dependencies)

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

Note: NO wallet-adapter packages needed!

## Key Points

1. **Use Direct Pontem API** - Don't use wallet-adapter
2. **All args as strings** - `arguments: args.map(a => String(a))`
3. **Check network** - Verify Lumio before transactions
4. **View via RPC** - Don't need wallet for reads
5. **Copy templates** - Don't write from scratch
6. **Handle errors** - Show user-friendly messages
