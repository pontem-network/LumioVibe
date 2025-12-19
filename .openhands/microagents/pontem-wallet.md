---
name: pontem-wallet
type: repo
version: 1.0.0
agent: CodeActAgent
---

# Pontem Wallet Integration Guide for Lumio Network

## Overview

Pontem Wallet is the primary wallet for Lumio Network. This guide shows the **correct** way to integrate it.

## Two Integration Approaches

### Approach 1: Direct Pontem API (RECOMMENDED for LumioVibe)

Use `window.pontem` directly for simpler, more reliable integration:

```typescript
// Check if Pontem is installed
declare global {
  interface Window {
    pontem?: PontemProvider;
  }
}

interface PontemProvider {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  network(): Promise<{ api: string; chainId: number }>;
  signAndSubmit(payload: TransactionPayload, options?: TxOptions): Promise<TxResult>;
  signMessage(message: SignMessagePayload, options?: { useNewFormat: boolean }): Promise<SignResult>;
}

interface TransactionPayload {
  function: string;           // Format: "0x123::module::function"
  arguments: (string | number | Uint8Array)[];
  type_arguments?: string[];  // Optional, for generic types
}

interface TxOptions {
  max_gas_amount?: string;
  gas_unit_price?: string;
  expiration_timestamp_secs?: string;
}

interface TxResult {
  success: boolean;
  payload?: TransactionPayload;
  result?: PendingTransaction;
}
```

### Approach 2: Wallet Adapter (Complex, more abstraction)

Uses `@aptos-labs/wallet-adapter-react` with Pontem plugin. More boilerplate but follows Aptos ecosystem patterns.

## CRITICAL: Transaction Payload Format

### CORRECT Format for `window.pontem.signAndSubmit()`:

```typescript
const { success, result } = await window.pontem.signAndSubmit({
  function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::function_name`,
  arguments: ["arg1", "100"],  // All as strings!
  type_arguments: []           // Empty for non-generic functions
});
```

### WRONG Format (Common Error):

```typescript
// ❌ WRONG - This is wallet-adapter format, NOT direct Pontem format
await signAndSubmitTransaction({
  data: {
    function: `...`,
    functionArguments: [...]  // Wrong key name!
  }
});
```

## Complete Integration Example

### 1. Types (src/types/pontem.ts)

```typescript
export interface PontemProvider {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  network(): Promise<PontemNetwork>;
  signAndSubmit(
    payload: PontemPayload,
    options?: PontemTxOptions
  ): Promise<PontemTxResult>;
}

export interface PontemNetwork {
  api: string;
  chainId: number;
  name: string;
}

export interface PontemPayload {
  function: string;
  arguments: (string | number | Uint8Array)[];
  type_arguments?: string[];
}

export interface PontemTxOptions {
  max_gas_amount?: string;
  gas_unit_price?: string;
}

export interface PontemTxResult {
  success: boolean;
  payload?: PontemPayload;
  result?: {
    hash: string;
    sender: string;
    sequence_number: string;
  };
}

declare global {
  interface Window {
    pontem?: PontemProvider;
  }
}
```

### 2. Hook (src/hooks/usePontem.ts)

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { PontemProvider } from '../types/pontem';

const LUMIO_TESTNET_RPC = 'https://api.testnet.lumio.io/v1';

export function usePontem() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pontem = typeof window !== 'undefined' ? window.pontem : undefined;

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (!pontem) return;
    try {
      const isConn = await pontem.isConnected();
      if (isConn) {
        const addr = await pontem.account();
        setAccount(addr);
        setConnected(true);
      }
    } catch (e) {
      console.error('Connection check failed:', e);
    }
  };

  const connect = useCallback(async () => {
    if (!pontem) {
      setError('Pontem Wallet not installed. Install from pontem.network');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const addr = await pontem.connect();
      setAccount(addr);
      setConnected(true);

      // Verify network
      const network = await pontem.network();
      if (!network.api?.includes('lumio')) {
        setError('Please switch to Lumio Testnet in Pontem Wallet');
      }

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [pontem]);

  const disconnect = useCallback(async () => {
    if (!pontem) return;
    try {
      await pontem.disconnect();
      setAccount(null);
      setConnected(false);
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  }, [pontem]);

  return {
    pontem,
    connected,
    account,
    loading,
    error,
    connect,
    disconnect,
    isInstalled: !!pontem,
  };
}
```

### 3. Contract Hook (src/hooks/useContract.ts)

```typescript
import { useState, useCallback } from 'react';
import { usePontem } from './usePontem';

// === LUMIO NETWORK CONSTANTS - DO NOT CHANGE ===
const LUMIO_CHAIN_ID = 2;  // CRITICAL: Always 2 for Lumio! NOT 1 or 4!
const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';  // NOT aptos URLs!

const CONTRACT_ADDRESS = '0x...your_address';
const MODULE_NAME = 'your_module';

export function useContract() {
  const { pontem, connected, account } = usePontem();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entry function (modifies state)
  const callEntryFunction = useCallback(async (
    functionName: string,
    args: (string | number)[] = [],
    typeArgs: string[] = []
  ) => {
    if (!pontem || !connected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { success, result } = await pontem.signAndSubmit({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${functionName}`,
        arguments: args.map(a => String(a)),  // Convert all to strings!
        type_arguments: typeArgs,
      });

      if (!success) {
        throw new Error('Transaction rejected');
      }

      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pontem, connected]);

  // View function (read-only, no wallet needed)
  const callViewFunction = useCallback(async <T>(
    functionName: string,
    args: (string | number)[] = [],
    typeArgs: string[] = []
  ): Promise<T | null> => {
    try {
      const response = await fetch(`${LUMIO_RPC}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${functionName}`,
          type_arguments: typeArgs,
          arguments: args.map(a => String(a)),
        }),
      });

      if (!response.ok) {
        throw new Error(`View call failed: ${response.status}`);
      }

      const result = await response.json();
      return result[0] as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'View call failed');
      return null;
    }
  }, []);

  // Example: initialize function
  const initialize = () => callEntryFunction('initialize');

  // Example: increment with amount
  const increment = (amount: number) => callEntryFunction('increment', [amount]);

  // Example: get_count view
  const getCount = (addr: string) => callViewFunction<number>('get_count', [addr]);

  return {
    initialize,
    increment,
    getCount,
    callEntryFunction,
    callViewFunction,
    loading,
    error,
    account,
  };
}
```

### 4. Component Example (src/pages/Home.tsx)

```typescript
import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract } from '../hooks/useContract';

export default function Home() {
  const { connected, account, connect, disconnect, isInstalled, error: walletError } = usePontem();
  const { initialize, getCount, increment, loading, error: txError } = useContract();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (account) {
      refreshCount();
    }
  }, [account]);

  const refreshCount = async () => {
    if (!account) return;
    const value = await getCount(account);
    if (value !== null) setCount(value);
  };

  const handleIncrement = async () => {
    const result = await increment(1);
    if (result) {
      // Wait a bit for transaction to process
      setTimeout(refreshCount, 2000);
    }
  };

  if (!isInstalled) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Pontem Wallet Required</h2>
        <p className="mb-4">Please install Pontem Wallet to use this app</p>
        <a
          href="https://pontem.network/pontem-wallet"
          target="_blank"
          className="bg-purple-600 px-6 py-3 rounded-lg"
        >
          Install Pontem Wallet
        </a>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
        <button onClick={connect} className="bg-purple-600 px-6 py-3 rounded-lg">
          Connect Pontem Wallet
        </button>
        {walletError && <p className="text-red-400 mt-4">{walletError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-400">Connected:</span>
          <span className="font-mono text-sm">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </span>
        </div>

        <div className="text-center mb-6">
          <p className="text-4xl font-bold">{count}</p>
          <p className="text-gray-400">Current Count</p>
        </div>

        {txError && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4">
            <p className="text-red-300 text-sm">{txError}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleIncrement}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-lg"
          >
            {loading ? 'Processing...' : 'Increment'}
          </button>
          <button
            onClick={disconnect}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `functionArguments is not valid` | Using wallet-adapter format with direct Pontem | Use `arguments` key, not `functionArguments` |
| `Pontem Wallet not installed` | User doesn't have extension | Show install link |
| `Access denied (401)` | User rejected transaction | Catch error, show message |
| `Wrong network` | Wallet on different chain | Check `pontem.network()` before tx |
| `Arguments type mismatch` | Numbers passed as numbers | Convert ALL args to strings |

## Network Verification

Always verify user is on Lumio Testnet before transactions:

```typescript
const network = await window.pontem.network();
if (!network.api?.includes('lumio')) {
  throw new Error('Please switch to Lumio Testnet');
}
// Proceed with transaction
```

## Key Points Summary

1. **Use Direct Pontem API** - Simpler than wallet-adapter for Lumio
2. **All arguments as strings** - `arguments: ["100", "0x123"]`
3. **Function format** - `"0xADDR::module::function"`
4. **Check network** - Verify Lumio before transactions
5. **View functions via RPC** - Don't need wallet for reads
