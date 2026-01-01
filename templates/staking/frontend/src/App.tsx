import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { usePontem } from './hooks/usePontem';
import Home from './pages/Home';

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
        Staking Pool
      </span>
    </div>
  );
}

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
        className="btn-primary"
      >
        Get Pontem Wallet
      </a>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <span className="status-badge success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Connected
        </span>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm font-mono text-white/80">{account?.slice(0,6)}...{account?.slice(-4)}</span>
          <button
            onClick={disconnect}
            className="ml-2 text-white/40 hover:text-white/80 transition-colors"
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
    <button onClick={connect} className="btn-primary">
      Connect Wallet
    </button>
  );
}

function Navigation() {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-1">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
        Home
      </Link>
    </nav>
  );
}

export default function App() {
  const { isTestMode } = usePontem();

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-0 bg-noise pointer-events-none" />

      {isTestMode && (
        <div className="relative z-50 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-center py-2 text-sm font-medium backdrop-blur-sm">
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            TEST MODE - Transactions signed with test private key
          </span>
        </div>
      )}

      <header className="relative z-40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Link to="/">
                <Logo />
              </Link>
              <Navigation />
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-white/40">
            <span>Built on Lumio Network</span>
            <div className="flex items-center gap-6">
              <a href="https://lumio.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                Lumio
              </a>
              <a href="https://pontem.network" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                Pontem
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
