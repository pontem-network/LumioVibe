import { Routes, Route } from 'react-router-dom';
import { usePontem } from './hooks/usePontem';
import Home from './pages/Home';

function WalletButton() {
  const { connected, account, connect, disconnect, isInstalled, isTestMode } = usePontem();

  if (isTestMode) {
    return (
      <div className="flex items-center gap-3">
        <span className="status-badge warning">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Test Mode
        </span>
        <div className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-sm font-mono text-purple-300">{account?.slice(0,6)}...{account?.slice(-4)}</span>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <a
        href="https://pontem.network/pontem-wallet"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary text-sm"
      >
        Install Wallet
      </a>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <span className="status-badge success">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Connected
        </span>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-sm font-mono text-purple-300">{account?.slice(0,6)}...{account?.slice(-4)}</span>
          <button
            onClick={disconnect}
            className="ml-2 text-white/40 hover:text-pink-400 transition-colors"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={connect} className="btn-primary text-sm">
      Connect Wallet
    </button>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isTestMode } = usePontem();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="nft-glow-orb purple" />
      <div className="nft-glow-orb pink" />

      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 bg-noise pointer-events-none" />

      {isTestMode && (
        <div className="relative z-50 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-center py-2.5 text-sm font-medium backdrop-blur-sm">
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Test Mode - Transactions signed with test private key
          </span>
        </div>
      )}

      <header className="relative z-40 border-b border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  NFT Collection
                </h1>
                <p className="text-xs text-white/40">Lumio Network</p>
              </div>
            </div>

            <WalletButton />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-purple-500/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-white/30">
            <span>Built on Lumio Network</span>
            <div className="flex items-center gap-6">
              <a href="https://lumio.io" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                Lumio
              </a>
              <a href="https://pontem.network" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">
                Pontem
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Layout>
  );
}
