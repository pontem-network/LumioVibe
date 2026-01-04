---
name: lumio-react
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- react
- frontend
- vite
- pontem
- wallet
---

# React Frontend Development for Lumio dApps

## Tech Stack

- React 19 + Vite 7
- TailwindCSS 4
- TypeScript
- Pontem Wallet (direct API, NO wallet adapters!)

## Project Structure

```
/workspace/app/frontend/
├── .env                    # VITE_CONTRACT_ADDRESS
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css           # Glass, gradient, animation styles
    ├── types/pontem.ts     # Wallet types
    ├── hooks/
    │   ├── usePontem.ts    # Wallet connection
    │   └── useContract.ts  # Contract calls
    └── pages/Home.tsx
```

## CRITICAL: NO Mock Data!

ALL data MUST come from blockchain via view functions:

```typescript
// ❌ WRONG - Mock data
setBalance(1000000000);
setUserData({ name: 'Test', value: 100 });

// ✅ CORRECT - Fetch from chain
const balance = await callView<number>('get_balance', [account]);
setBalance(balance);
```

## Pontem Wallet Integration

DO NOT use `@aptos-labs/wallet-adapter-react`! Use direct Pontem API:

```typescript
// Connect
const result = await window.pontem.connect();

// Sign and submit transaction
const { success, result } = await window.pontem.signAndSubmit({
  function: `${CONTRACT_ADDRESS}::module::function`,
  arguments: ["arg1", "100"],  // ALL MUST BE STRINGS!
  type_arguments: []
});

// Check network (Chain ID 2 = Lumio Testnet)
const network = await window.pontem.network();
if (network.chainId !== 2) {
  await window.pontem.switchNetwork(2);
}
```

## useContract Hook Pattern

```typescript
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const MODULE_NAME = 'your_module';  // CHANGE THIS!
const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';

export function useContract() {
  const { pontem, connected } = usePontem();

  // Entry function (modifies state, requires wallet)
  const callEntry = async (fn: string, args: any[] = []) => {
    const { success, result } = await pontem.signAndSubmit({
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
      arguments: args.map(a => String(a)),  // MUST be strings!
      type_arguments: [],
    });
    return success ? result : null;
  };

  // View function (read-only, no wallet needed)
  const callView = async <T>(fn: string, args: any[] = []): Promise<T | null> => {
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

  // Add wrappers for YOUR contract functions
  const myFunction = () => callEntry('my_function');
  const getData = (addr: string) => callView<number>('get_data', [addr]);

  return { callEntry, callView, myFunction, getData };
}
```

## Data Flow Pattern

```typescript
export default function Home() {
  const { account, connected } = usePontem();
  const { getData, myFunction } = useContract();
  const [data, setData] = useState<number>(0);

  // Fetch data from chain
  const refreshData = useCallback(async () => {
    if (!account) return;
    const result = await getData(account);
    if (result !== null) setData(result);
  }, [account, getData]);

  // Load on connect
  useEffect(() => {
    if (account) refreshData();
  }, [account, refreshData]);

  // ALWAYS refresh after transactions!
  const handleAction = async () => {
    const result = await myFunction();
    if (result) await refreshData();  // ← CRITICAL!
  };

  return (/* UI */);
}
```

## Modern Design Classes

Use pre-built CSS classes for professional look:

```typescript
// Glass card
<div className="glass-card p-8">

// Gradient button
<button className="btn-primary">Action</button>

// Large stat with glow
<div className="stat-value animate-glow">{value}</div>

// Status badges
<span className="status-badge success">Connected</span>

// Floating animation
<div className="animate-float">
```

## Scripts

```bash
# Build (check for TypeScript errors!)
cd /workspace/app/frontend && pnpm build

# Restart dev server
bash /openhands/templates/counter/start.sh /workspace/app --background

# Start in test mode (auto-sign without wallet)
bash /openhands/templates/counter/start.sh /workspace/app --test --background
```

## Common Errors

| Error | Fix |
|-------|-----|
| Data not updating | Call `refreshData()` after transactions |
| Wrong network | Check `chainId === 2` before TX |
| Arguments error | Convert ALL args to strings |
| Wallet not found | Check `window.pontem` exists |
