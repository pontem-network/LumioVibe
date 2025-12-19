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

    # src/pages/Home.tsx - Initial placeholder page
    # This page works BEFORE the contract is deployed
    # Agent should customize it after writing spec.md
    cat > "$OUTPUT_DIR/frontend/src/pages/Home.tsx" <<EOF
import { usePontem } from '../hooks/usePontem';
import { useContract } from '../hooks/useContract';

// ═══════════════════════════════════════════════════════════════════
// ⚠️  THIS IS A PLACEHOLDER PAGE
// ═══════════════════════════════════════════════════════════════════
//
// This page will display until you:
// 1. Fill in spec.md with your project requirements
// 2. Update Documentation.tsx with your spec
// 3. Implement and deploy your Move contract
// 4. Customize this page for YOUR contract
//
// ⚠️⚠️⚠️ WHEN CUSTOMIZING - ABSOLUTE RULES: ⚠️⚠️⚠️
// 1. ALL data MUST come from callView - NEVER use hardcoded/mock values!
// 2. ALL actions MUST call callEntry - NEVER just console.log!
// 3. After successful transaction, call refreshData() to update from chain!
//
// ❌ FORBIDDEN: setBalance(1000000); or "// Mock data for now"
// ✅ CORRECT: const bal = await getBalance(account); setBalance(bal);
// ═══════════════════════════════════════════════════════════════════

export default function Home() {
  const { connected, account, isTestMode } = usePontem();
  const { contractAddress } = useContract();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-block mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
            <span className="text-4xl">🚀</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          $PROJECT_NAME
        </h1>
        <p className="text-gray-400 text-lg">
          A decentralized application on Lumio Network
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="text-yellow-400">⏳</span> Project Status
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-medium">Project Created</div>
              <div className="text-sm text-gray-400">Frontend is running</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-xl">
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-medium text-yellow-400">Next: Fill spec.md</div>
              <div className="text-sm text-gray-400">Define your contract requirements</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl opacity-50">
            <span className="text-2xl">📖</span>
            <div>
              <div className="font-medium">Update Documentation</div>
              <div className="text-sm text-gray-400">Write docs based on spec</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl opacity-50">
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="font-medium">Implement Contract</div>
              <div className="text-sm text-gray-400">Write and deploy Move code</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl opacity-50">
            <span className="text-2xl">🎨</span>
            <div>
              <div className="font-medium">Build UI</div>
              <div className="text-sm text-gray-400">Customize this page</div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">CONNECTION INFO</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Mode</span>
            <span className={isTestMode ? 'text-yellow-400 font-medium' : 'text-green-400 font-medium'}>
              {isTestMode ? '🧪 Test Mode' : '🔐 Production'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Network</span>
            <span className="text-purple-400 font-medium">Lumio Testnet</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Wallet</span>
            <span className="text-gray-300">
              {connected || isTestMode
                ? \`\${account?.slice(0,6)}...\${account?.slice(-4)}\`
                : 'Not connected'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Contract</span>
            <span className="text-gray-300 font-mono text-xs">
              {contractAddress?.slice(0,10)}...{contractAddress?.slice(-6)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <a
          href="/docs"
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-center py-4 rounded-xl font-medium transition-colors"
        >
          📖 View Documentation
        </a>
        <a
          href="https://lumio.io"
          target="_blank"
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-center py-4 rounded-xl font-medium transition-colors"
        >
          🌐 About Lumio
        </a>
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
