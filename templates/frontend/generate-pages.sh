#!/bin/bash
# Generate React pages
# Usage: source this file, then call generate_pages

generate_pages() {
    local OUTPUT_DIR="$1"
    local PROJECT_NAME="$2"

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
import { useState, useEffect, useCallback } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract } from '../hooks/useContract';

// ⚠️ CRITICAL: This is an EXAMPLE page for a counter contract!
// You MUST customize this for YOUR contract!
//
// ⚠️⚠️⚠️ ABSOLUTE RULES - NO EXCEPTIONS: ⚠️⚠️⚠️
// 1. ALL data MUST come from callView - NEVER use hardcoded/mock values!
// 2. ALL actions MUST call callEntry - NEVER just console.log!
// 3. After successful transaction, call refreshData() to update from chain!
//
// ❌ FORBIDDEN: setBalance(1000000); or "// Mock data for now"
// ✅ CORRECT: const bal = await getBalance(account); setBalance(bal);

export default function Home() {
  const { connected, account, error: walletError, isInstalled, isTestMode } = usePontem();
  // ⚠️ Update these imports to match YOUR useContract exports!
  const { initialize, increment, getCount, isInitialized, loading, error: txError, contractAddress } = useContract();

  // ✅ State initialized to empty/zero - NOT mock values!
  const [initialized, setInitialized] = useState(false);
  const [count, setCount] = useState<number>(0);

  useEffect(() => { if (account) refreshData(); }, [account]);

  // ✅ CORRECT: All data fetched from blockchain via view functions
  const refreshData = useCallback(async () => {
    if (!account) return;
    const isInit = await isInitialized(account);
    setInitialized(!!isInit);
    if (isInit) {
      const c = await getCount(account);
      if (c !== null) setCount(c);
    }
  }, [account, isInitialized, getCount]);

  // ✅ CORRECT: Actions call real entry functions, then refresh
  const handleInitialize = async () => {
    const result = await initialize();
    if (result) await refreshData();  // ✅ Refresh from chain after TX
  };
  const handleIncrement = async () => {
    const result = await increment();
    if (result) await refreshData();  // ✅ Refresh from chain after TX
  };

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
}
