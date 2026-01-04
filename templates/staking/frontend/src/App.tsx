import { Routes, Route } from 'react-router-dom';
import { usePontem } from './hooks/usePontem';
import Home from './pages/Home';

function WalletButton() {
  const { connected, account, connect, disconnect, isInstalled, isTestMode } = usePontem();

  if (isTestMode) {
    return (
      <div className="flex items-center gap-3">
        <span className="status-badge warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          Test Mode
        </span>
        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm font-mono text-white/60">{account?.slice(0,6)}...{account?.slice(-4)}</span>
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
        className="btn-primary text-sm py-2 px-4"
      >
        Get Pontem Wallet
      </a>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span className="text-sm font-mono text-white/80">{account?.slice(0,6)}...{account?.slice(-4)}</span>
        <button
          onClick={disconnect}
          className="ml-1 text-white/40 hover:text-white/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} className="btn-primary text-sm py-2 px-4">
      Connect Wallet
    </button>
  );
}

export default function App() {
  const { isTestMode } = usePontem();

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 bg-noise pointer-events-none" />

      {/* Top bar with wallet */}
      <div className="fixed top-4 right-4 z-50">
        <div className="glass-card px-4 py-2">
          <WalletButton />
        </div>
      </div>

      {isTestMode && (
        <div className="fixed top-4 left-4 z-50">
          <span className="status-badge warning text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Test Mode
          </span>
        </div>
      )}

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>Built on Lumio Network</span>
            <div className="flex items-center gap-4">
              <a href="https://lumio.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
                Lumio
              </a>
              <a href="https://pontem.network" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
                Pontem
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
