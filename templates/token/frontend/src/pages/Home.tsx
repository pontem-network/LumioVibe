import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract, TokenInfo } from '../hooks/useContract';

type Tab = 'overview' | 'mint' | 'transfer' | 'burn';

function TabButton({ tab, activeTab, onClick, children }: {
  tab: Tab;
  activeTab: Tab;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`tab-button ${activeTab === tab ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon, color = 'indigo' }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'amber' | 'blue';
}) {
  const colorClasses = {
    indigo: 'from-indigo-500/20 to-purple-500/20 text-indigo-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
  };

  return (
    <div className="glass-card p-5 gradient-border">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-white/40">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
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
  variant?: 'primary' | 'secondary' | 'mint' | 'transfer' | 'burn';
}) {
  const className = variant === 'secondary' ? 'btn-secondary' :
    variant === 'mint' ? 'btn-mint' :
    variant === 'transfer' ? 'btn-transfer' :
    variant === 'burn' ? 'btn-burn' : 'btn-primary';

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
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

function formatAmount(amount: number, decimals: number): string {
  return (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export default function Home() {
  const { connected, account, isTestMode } = usePontem();
  const {
    initialize, register, mint, burn, transfer,
    getBalance, getTokenInfo, isInitialized, isRegistered,
    loading, error, contractAddress, isContractConfigured
  } = useContract();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenExists, setTokenExists] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [initName, setInitName] = useState('');
  const [initSymbol, setInitSymbol] = useState('');
  const [initDecimals, setInitDecimals] = useState('8');

  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const [burnAmount, setBurnAmount] = useState('');

  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const showSuccessToast = (msg: string) => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const refreshData = async () => {
    if (!account || !contractAddress) return;
    setRefreshing(true);
    try {
      const exists = await isInitialized(contractAddress);
      setTokenExists(exists || false);

      if (exists) {
        const info = await getTokenInfo(contractAddress);
        setTokenInfo(info);
        setIsOwner(contractAddress === account);

        const registered = await isRegistered(account);
        setUserRegistered(registered || false);

        if (registered) {
          const bal = await getBalance(account);
          setBalance(bal || 0);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (account) {
      refreshData();
    }
  }, [account, contractAddress]);

  const handleInitialize = async () => {
    if (!initName || !initSymbol) return;
    const result = await initialize(initName, initSymbol, parseInt(initDecimals) || 8);
    if (result) {
      showSuccessToast('Token initialized successfully!');
      await refreshData();
    }
  };

  const handleRegister = async () => {
    const result = await register();
    if (result) {
      showSuccessToast('Registered successfully!');
      await refreshData();
    }
  };

  const handleMint = async () => {
    if (!mintTo || !mintAmount) return;
    const decimals = tokenInfo?.decimals || 8;
    const rawAmount = Math.floor(parseFloat(mintAmount) * Math.pow(10, decimals));
    const result = await mint(mintTo, rawAmount);
    if (result) {
      showSuccessToast(`Minted ${mintAmount} tokens!`);
      setMintTo('');
      setMintAmount('');
      await refreshData();
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;
    const decimals = tokenInfo?.decimals || 8;
    const rawAmount = Math.floor(parseFloat(transferAmount) * Math.pow(10, decimals));
    const result = await transfer(transferTo, rawAmount);
    if (result) {
      showSuccessToast(`Transferred ${transferAmount} tokens!`);
      setTransferTo('');
      setTransferAmount('');
      await refreshData();
    }
  };

  const handleBurn = async () => {
    if (!burnAmount) return;
    const decimals = tokenInfo?.decimals || 8;
    const rawAmount = Math.floor(parseFloat(burnAmount) * Math.pow(10, decimals));
    const result = await burn(rawAmount);
    if (result) {
      showSuccessToast(`Burned ${burnAmount} tokens!`);
      setBurnAmount('');
      await refreshData();
    }
  };

  // Not connected state
  if (!connected && !isTestMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="animate-float mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v2m0 8v2m-4-6h2m6 0h2" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            Token dApp
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-md mb-8">
          Create and manage fungible tokens on Lumio Network
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

  // Contract not configured
  if (!isContractConfigured) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="animate-float mb-8 inline-block">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v2m0 8v2m-4-6h2m6 0h2" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              Token dApp
            </span>
          </h1>
          <p className="text-lg text-white/50">
            Contract deployment required
          </p>
        </div>

        <div className="glass-card p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Contract Not Deployed</h3>
              <p className="text-white/50 text-sm">
                Deploy the token contract first, then configure the environment variables.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-white/5 font-mono text-sm">
            <div>
              <p className="text-white/40 mb-1"># 1. Deploy contract</p>
              <p className="text-emerald-400">lumio move publish --profile testnet</p>
            </div>
            <div>
              <p className="text-white/40 mb-1"># 2. Set environment variables</p>
              <p className="text-blue-400">VITE_CONTRACT_ADDRESS=0x...</p>
              <p className="text-blue-400">VITE_PRIVATE_KEY=0x... <span className="text-white/30">(for test mode)</span></p>
            </div>
            <div>
              <p className="text-white/40 mb-1"># 3. Restart dev server</p>
              <p className="text-purple-400">pnpm dev</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Current mode</span>
              <span className={isTestMode ? 'text-amber-400' : 'text-emerald-400'}>
                {isTestMode ? 'Test Mode' : 'Production'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token not initialized - show create form
  if (!tokenExists) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              Create Token
            </span>
          </h1>
          <p className="text-lg text-white/50">
            Deploy your own fungible token on Lumio
          </p>
        </div>

        <div className="glass-card p-8">
          <div className="space-y-6">
            <div>
              <label className="input-label">Token Name</label>
              <input
                type="text"
                value={initName}
                onChange={(e) => setInitName(e.target.value)}
                placeholder="e.g. My Token"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Symbol</label>
              <input
                type="text"
                value={initSymbol}
                onChange={(e) => setInitSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. MTK"
                maxLength={10}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Decimals</label>
              <input
                type="number"
                value={initDecimals}
                onChange={(e) => setInitDecimals(e.target.value)}
                min="0"
                max="18"
                className="input-field"
              />
              <p className="text-xs text-white/30 mt-2">Standard is 8 decimals</p>
            </div>
            <ActionButton
              onClick={handleInitialize}
              loading={loading}
              disabled={!initName || !initSymbol}
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Token
              </span>
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  // User not registered
  if (!userRegistered) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <div className="token-symbol mb-4">{tokenInfo?.symbol || 'TOKEN'}</div>
          <h1 className="text-2xl font-bold text-white mb-2">{tokenInfo?.name || 'Token'}</h1>
          <p className="text-white/50">Register to receive and hold tokens</p>
        </div>

        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-3">Register Your Account</h2>
          <p className="text-white/50 mb-8 text-sm">
            Create a balance resource on your account to start receiving {tokenInfo?.symbol || 'tokens'}
          </p>
          <ActionButton onClick={handleRegister} loading={loading}>
            Register
          </ActionButton>
        </div>
      </div>
    );
  }

  // Main token interface
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="token-symbol">{tokenInfo?.symbol}</span>
          {isOwner && (
            <span className="status-badge success">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Owner
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{tokenInfo?.name}</h1>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-white/40 uppercase tracking-wider mb-2">Your Balance</p>
        <div className="balance-display animate-glow mb-2">
          {refreshing ? '...' : formatAmount(balance, tokenInfo?.decimals || 8)}
        </div>
        <p className="text-white/40">{tokenInfo?.symbol}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Supply"
          value={formatAmount(tokenInfo?.totalSupply || 0, tokenInfo?.decimals || 8)}
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Decimals"
          value={tokenInfo?.decimals || 0}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
        />
        <StatCard
          label="Network"
          value="Lumio"
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          }
        />
        <StatCard
          label="Mode"
          value={isTestMode ? 'Test' : 'Live'}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Action Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-white/5">
          <TabButton tab="overview" activeTab={activeTab} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          {isOwner && (
            <TabButton tab="mint" activeTab={activeTab} onClick={() => setActiveTab('mint')}>
              Mint
            </TabButton>
          )}
          <TabButton tab="transfer" activeTab={activeTab} onClick={() => setActiveTab('transfer')}>
            Transfer
          </TabButton>
          <TabButton tab="burn" activeTab={activeTab} onClick={() => setActiveTab('burn')}>
            Burn
          </TabButton>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-0">
              <div className="info-row">
                <span className="info-label">Contract Address</span>
                <span className="info-value font-mono text-xs">
                  {contractAddress?.slice(0, 12)}...{contractAddress?.slice(-8)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Token Name</span>
                <span className="info-value">{tokenInfo?.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Symbol</span>
                <span className="info-value text-amber-400">{tokenInfo?.symbol}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Decimals</span>
                <span className="info-value">{tokenInfo?.decimals}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total Supply</span>
                <span className="info-value">{formatAmount(tokenInfo?.totalSupply || 0, tokenInfo?.decimals || 8)} {tokenInfo?.symbol}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Your Role</span>
                <span className={`info-value ${isOwner ? 'text-emerald-400' : 'text-white/60'}`}>
                  {isOwner ? 'Owner' : 'Holder'}
                </span>
              </div>
              <div className="pt-4">
                <ActionButton onClick={refreshData} loading={refreshing} variant="secondary">
                  <span className="inline-flex items-center gap-2">
                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </span>
                </ActionButton>
              </div>
            </div>
          )}

          {activeTab === 'mint' && isOwner && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400">
                  <strong>Mint tokens</strong> — Create new tokens and send them to any registered address.
                </p>
              </div>
              <div>
                <label className="input-label">Recipient Address</label>
                <input
                  type="text"
                  value={mintTo}
                  onChange={(e) => setMintTo(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="input-label">Amount</label>
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="input-field"
                />
              </div>
              <ActionButton
                onClick={handleMint}
                loading={loading}
                disabled={!mintTo || !mintAmount}
                variant="mint"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Mint Tokens
                </span>
              </ActionButton>
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  <strong>Transfer tokens</strong> — Send tokens to another registered address.
                </p>
              </div>
              <div>
                <label className="input-label">Recipient Address</label>
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                />
              </div>
              <div>
                <label className="input-label">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="input-field pr-20"
                  />
                  <button
                    onClick={() => setTransferAmount(formatAmount(balance, tokenInfo?.decimals || 8).replace(/,/g, ''))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-white/30 mt-2">
                  Available: {formatAmount(balance, tokenInfo?.decimals || 8)} {tokenInfo?.symbol}
                </p>
              </div>
              <ActionButton
                onClick={handleTransfer}
                loading={loading}
                disabled={!transferTo || !transferAmount || parseFloat(transferAmount) <= 0}
                variant="transfer"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Transfer
                </span>
              </ActionButton>
            </div>
          )}

          {activeTab === 'burn' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400">
                  <strong>Burn tokens</strong> — Permanently destroy tokens from your balance.
                </p>
              </div>
              <div>
                <label className="input-label">Amount to Burn</label>
                <div className="relative">
                  <input
                    type="number"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="input-field pr-20"
                  />
                  <button
                    onClick={() => setBurnAmount(formatAmount(balance, tokenInfo?.decimals || 8).replace(/,/g, ''))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 hover:text-amber-300"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-white/30 mt-2">
                  Available: {formatAmount(balance, tokenInfo?.decimals || 8)} {tokenInfo?.symbol}
                </p>
              </div>
              <ActionButton
                onClick={handleBurn}
                loading={loading}
                disabled={!burnAmount || parseFloat(burnAmount) <= 0}
                variant="burn"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                  Burn Tokens
                </span>
              </ActionButton>
            </div>
          )}
        </div>
      </div>

      {/* Toasts */}
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

      {showSuccess && (
        <div className="success-toast">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-emerald-400">Success</p>
              <p className="text-sm text-white/60 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
