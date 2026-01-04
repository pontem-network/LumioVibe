import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract } from '../hooks/useContract';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 gradient-border">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
          {icon}
        </div>
        <div>
          <p className="text-sm text-white/40">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, children, variant = 'primary' }: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="loading-spinner" />
          Processing...
        </span>
      ) : children}
    </button>
  );
}

export default function Home() {
  const { connected, account, isTestMode } = usePontem();
  const { initialize, increment, getCount, isInitialized, loading, error, contractAddress } = useContract();

  const [count, setCount] = useState<number | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const refreshData = async () => {
    if (!account) return;
    setRefreshing(true);
    try {
      const exists = await isInitialized(account);
      setInitialized(exists || false);
      if (exists) {
        const value = await getCount(account);
        setCount(value);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (account) {
      refreshData();
    }
  }, [account]);

  const handleInitialize = async () => {
    const result = await initialize();
    if (result) {
      await refreshData();
    }
  };

  const handleIncrement = async () => {
    const result = await increment();
    if (result) {
      await refreshData();
    }
  };

  if (!connected && !isTestMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="animate-float mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            Counter dApp
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-md mb-8">
          Connect your wallet to interact with the counter smart contract on Lumio Network
        </p>
        <div className="flex items-center gap-4">
          <span className="status-badge info">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lumio Testnet
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            Counter dApp
          </span>
        </h1>
        <p className="text-lg text-white/50">
          A decentralized counter powered by Move smart contracts
        </p>
      </div>

      {!initialized ? (
        <div className="glass-card p-12 text-center">
          <div className="animate-float mb-8 inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Initialize Your Counter</h2>
          <p className="text-white/50 mb-8 max-w-sm mx-auto">
            Create a personal counter resource on the blockchain to start tracking your value
          </p>
          <ActionButton onClick={handleInitialize} loading={loading}>
            Initialize Counter
          </ActionButton>
        </div>
      ) : (
        <>
          <div className="glass-card p-12 text-center">
            <p className="text-sm text-white/40 uppercase tracking-wider mb-4">Current Value</p>
            <div className="stat-value animate-glow mb-6">
              {refreshing ? '...' : count ?? 0}
            </div>
            <div className="flex items-center justify-center gap-4">
              <ActionButton onClick={handleIncrement} loading={loading}>
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Increment
                </span>
              </ActionButton>
              <ActionButton onClick={refreshData} loading={refreshing} variant="secondary">
                <span className="inline-flex items-center gap-2">
                  <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Increments"
              value={count ?? 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatCard
              label="Network"
              value="Lumio"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              }
            />
            <StatCard
              label="Status"
              value={isTestMode ? 'Test' : 'Live'}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
          </div>
        </>
      )}

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Contract Details</h3>
        <div className="space-y-0">
          <div className="info-row">
            <span className="info-label">Contract Address</span>
            <span className="info-value font-mono text-xs">
              {contractAddress?.slice(0,12)}...{contractAddress?.slice(-8)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Network</span>
            <span className="info-value text-indigo-400">Lumio Testnet</span>
          </div>
          <div className="info-row">
            <span className="info-label">Module</span>
            <span className="info-value font-mono">counter::counter</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mode</span>
            <span className={`info-value ${isTestMode ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isTestMode ? 'Test Mode' : 'Production'}
            </span>
          </div>
        </div>
      </div>

      {showError && error && (
        <div className="error-toast">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-400">Error</p>
              <p className="text-sm text-white/60 mt-1">{error}</p>
            </div>
            <button onClick={() => setShowError(false)} className="text-white/40 hover:text-white/60 ml-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
