---
name: frontend-template
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- frontend
- react
- vite
- wallet
- pontem
---

# Frontend Template for Lumio dApps

## Setup

```bash
pnpm create vite frontend --template react-ts
cd frontend
pnpm install
pnpm add @aptos-labs/wallet-adapter-react @pontem-network/wallet-adapter-plugin
pnpm add tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Wallet Provider Setup

```tsx
// src/App.tsx
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PontemWallet } from "@pontem-network/wallet-adapter-plugin";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Documentation from "./pages/Documentation";

const wallets = [new PontemWallet()];

function App() {
  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      onError={(error) => console.error(error)}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documentation" element={<Documentation />} />
        </Routes>
      </BrowserRouter>
    </AptosWalletAdapterProvider>
  );
}

export default App;
```

## Wallet Connect Component

```tsx
// src/components/WalletConnect.tsx
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function WalletConnect() {
  const { connect, disconnect, account, connected, wallets } = useWallet();

  if (connected && account) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {wallets?.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => connect(wallet.name)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Connect {wallet.name}
        </button>
      ))}
    </div>
  );
}
```

## Contract Hook

```tsx
// src/hooks/useContract.tsx
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { useMemo } from "react";

const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address

const config = new AptosConfig({
  fullnode: "https://api.testnet.lumio.io/v1",
});

export function useContract() {
  const { account, signAndSubmitTransaction } = useWallet();
  const aptos = useMemo(() => new Aptos(config), []);

  const callEntryFunction = async (
    functionName: string,
    args: any[] = [],
    typeArgs: string[] = []
  ) => {
    if (!account) throw new Error("Wallet not connected");

    const response = await signAndSubmitTransaction({
      data: {
        function: `${CONTRACT_ADDRESS}::module_name::${functionName}`,
        typeArguments: typeArgs,
        functionArguments: args,
      },
    });

    return aptos.waitForTransaction({ transactionHash: response.hash });
  };

  const callViewFunction = async <T,>(
    functionName: string,
    args: any[] = [],
    typeArgs: string[] = []
  ): Promise<T> => {
    const result = await aptos.view({
      payload: {
        function: `${CONTRACT_ADDRESS}::module_name::${functionName}`,
        typeArguments: typeArgs,
        functionArguments: args,
      },
    });
    return result[0] as T;
  };

  return {
    account,
    callEntryFunction,
    callViewFunction,
    isConnected: !!account,
  };
}
```

## Home Page Template

```tsx
// src/pages/Home.tsx
import { useState } from "react";
import { WalletConnect } from "../components/WalletConnect";
import { useContract } from "../hooks/useContract";
import { Link } from "react-router-dom";

export default function Home() {
  const { account, callEntryFunction, callViewFunction, isConnected } = useContract();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      await callEntryFunction("function_name", []);
      // Refresh data after action
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My dApp</h1>
          <nav className="flex items-center gap-4">
            <Link to="/documentation" className="text-blue-500 hover:underline">
              Documentation
            </Link>
            <WalletConnect />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isConnected ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contract Interaction</h2>
            <button
              onClick={handleAction}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? "Processing..." : "Call Function"}
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Connect your wallet to continue</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

## Documentation Page (REQUIRED)

```tsx
// src/pages/Documentation.tsx
import { Link } from "react-router-dom";

const CONTRACT_ADDRESS = "0x...";
const MODULE_NAME = "module_name";

const functions = [
  {
    name: "initialize",
    type: "entry",
    params: [{ name: "account", type: "&signer" }],
    description: "Initialize the contract for the caller",
  },
  {
    name: "get_value",
    type: "view",
    params: [{ name: "addr", type: "address" }],
    returns: "u64",
    description: "Get the current value for an address",
  },
];

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="text-blue-500 hover:underline">
            ← Back to App
          </Link>
          <h1 className="text-2xl font-bold mt-2">Contract Documentation</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600">
            Description of what this contract does...
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contract Address</h2>
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {CONTRACT_ADDRESS}::{MODULE_NAME}
          </code>
          <p className="text-sm text-gray-500 mt-2">Deployed on Lumio Testnet</p>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Functions</h2>
          <div className="space-y-6">
            {functions.map((fn) => (
              <div key={fn.name} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono font-semibold">{fn.name}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      fn.type === "view"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {fn.type}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{fn.description}</p>
                <div className="text-sm">
                  <span className="font-semibold">Parameters: </span>
                  {fn.params.map((p) => `${p.name}: ${p.type}`).join(", ") || "none"}
                </div>
                {fn.returns && (
                  <div className="text-sm">
                    <span className="font-semibold">Returns: </span>
                    {fn.returns}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

## vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external access
  },
});
```

## Required Dependencies

```json
{
  "dependencies": {
    "@aptos-labs/wallet-adapter-react": "^3.0.0",
    "@pontem-network/wallet-adapter-plugin": "^0.2.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0"
  }
}
```

## Key Points

1. Always include Documentation page with contract info
2. Use Pontem Wallet adapter
3. Configure for Lumio Testnet URLs
4. Show wallet connection status
5. Handle loading states for transactions
6. Use TailwindCSS for styling
