import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract, PoolInfo, UserStakeInfo } from '../hooks/useContract';

export default function Home() {
  const { connected, account, isTestMode } = usePontem();
  const {
    initializePool,
    stake,
    unstake,
    claimRewards,
    getPoolInfo,
    getUserStake,
    poolExists,
    getBalance,
    loading,
    error,
    contractAddress,
  } = useContract();

  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [userStake, setUserStake] = useState<UserStakeInfo | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [hasPool, setHasPool] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [showFaq, setShowFaq] = useState(false);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [initialRewards, setInitialRewards] = useState('1000000');

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const refreshData = async () => {
    if (!account || !contractAddress) return;
    setRefreshing(true);
    try {
      const bal = await getBalance(account);
      setBalance(bal);
      const exists = await poolExists(contractAddress);
      setHasPool(exists || false);
      if (exists) {
        const pool = await getPoolInfo(contractAddress);
        setPoolInfo(pool);
        const stakeData = await getUserStake(account);
        setUserStake(stakeData);
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

  const handleInitializePool = async () => {
    const result = await initializePool(toBaseUnits(initialRewards));
    if (result) await refreshData();
  };

  const handleStake = async () => {
    if (!stakeAmount || !contractAddress) return;
    const amount = toBaseUnits(stakeAmount);
    if (amount === 0) return;
    const result = await stake(contractAddress, amount);
    if (result) {
      setStakeAmount('');
      await refreshData();
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || !contractAddress) return;
    const amount = toBaseUnits(unstakeAmount);
    if (amount === 0) return;
    const result = await unstake(contractAddress, amount);
    if (result) {
      setUnstakeAmount('');
      await refreshData();
    }
  };

  const handleClaimRewards = async () => {
    const result = await claimRewards();
    if (result) await refreshData();
  };

  const DECIMALS = 8;

  const toBaseUnits = (amount: string): number => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) return 0;
    return Math.floor(parsed * Math.pow(10, DECIMALS));
  };

  const fromBaseUnits = (amount: number): number => {
    return amount / Math.pow(10, DECIMALS);
  };

  const formatAmount = (amount: number) => {
    const display = fromBaseUnits(amount);
    if (display === 0) return '0';
    if (display < 0.0001) return '<0.0001';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(display);
  };

  // Not connected state
  if (!connected && !isTestMode) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Stake tokens</h1>
          <p className="text-white/50 text-lg mb-8">
            Stake and earn 10% rewards instantly on Lumio Network
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Connect wallet to start
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center pt-8">
      {/* Main Widget */}
      <div className="w-full max-w-lg">
        {!hasPool ? (
          /* Initialize Pool */
          <div className="bg-[#1a1f2e] rounded-3xl p-8 border border-white/5">
            <h2 className="text-xl font-bold text-white mb-2">Initialize Pool</h2>
            <p className="text-white/40 text-sm mb-6">Create a staking pool with initial rewards</p>

            <div className="mb-6">
              <label className="block text-sm text-white/50 mb-2">Initial reward amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={initialRewards}
                  onChange={(e) => setInitialRewards(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-2xl px-4 py-4 text-2xl font-semibold text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-medium">tokens</span>
              </div>
            </div>

            <button
              onClick={handleInitializePool}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Initializing...' : 'Initialize Pool'}
            </button>
          </div>
        ) : (
          <>
            {/* Staking Widget */}
            <div className="bg-[#1a1f2e] rounded-3xl border border-white/5 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('stake')}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'stake'
                      ? 'text-white bg-white/5'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Stake
                </button>
                <button
                  onClick={() => setActiveTab('unstake')}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'unstake'
                      ? 'text-white bg-white/5'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Unstake
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'stake' ? (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/40">Amount</span>
                        <button
                          onClick={() => setStakeAmount(String(fromBaseUnits(balance)))}
                          className="text-white/40 hover:text-emerald-400 transition-colors"
                        >
                          Balance: {formatAmount(balance)} LUM
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="w-full bg-[#0d1117] border border-white/10 rounded-2xl px-4 py-5 text-3xl font-semibold text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="0"
                        />
                        <button
                          onClick={() => setStakeAmount(String(fromBaseUnits(balance)))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0d1117] rounded-xl p-4 mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/40">You will receive</span>
                        <span className="text-emerald-400 font-medium">+10% rewards</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40 text-sm">Reward amount</span>
                        <span className="text-white font-semibold">
                          {stakeAmount ? formatAmount(Math.floor(toBaseUnits(stakeAmount) * 0.1)) : '0'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStake}
                      disabled={loading || !stakeAmount || toBaseUnits(stakeAmount) > balance || toBaseUnits(stakeAmount) === 0}
                      className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Staking...' : toBaseUnits(stakeAmount) > balance ? 'Insufficient balance' : 'Stake'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/40">Amount</span>
                        <span className="text-white/40">Staked: {formatAmount(userStake?.stakedAmount || 0)}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                          max={userStake?.stakedAmount || 0}
                          className="w-full bg-[#0d1117] border border-white/10 rounded-2xl px-4 py-5 text-3xl font-semibold text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="0"
                        />
                        <button
                          onClick={() => setUnstakeAmount(String(fromBaseUnits(userStake?.stakedAmount || 0)))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleUnstake}
                      disabled={loading || !unstakeAmount || toBaseUnits(unstakeAmount) > (userStake?.stakedAmount || 0)}
                      className="w-full py-4 rounded-2xl font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Unstaking...' : 'Unstake'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Rewards Card */}
            {(userStake?.rewardsEarned || 0) > 0 && (
              <div className="mt-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-5 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-sm">Available rewards</p>
                    <p className="text-2xl font-bold text-white">{formatAmount(userStake?.rewardsEarned || 0)}</p>
                  </div>
                  <button
                    onClick={handleClaimRewards}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{formatAmount(poolInfo?.totalStaked || 0)}</p>
                <p className="text-white/40 text-sm">Total staked</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">10%</p>
                <p className="text-white/40 text-sm">Reward rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{formatAmount(userStake?.stakedAmount || 0)}</p>
                <p className="text-white/40 text-sm">Your stake</p>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="mt-8">
              <button
                onClick={() => setShowFaq(!showFaq)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-white font-semibold">How it works</span>
                <svg
                  className={`w-5 h-5 text-white/40 transition-transform duration-200 ${showFaq ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showFaq && (
                <div className="pb-4 space-y-4 text-sm text-white/50 animate-fadeIn">
                  <div>
                    <p className="text-white/70 font-medium mb-1">Staking</p>
                    <p>Deposit tokens to the pool and receive 10% rewards instantly.</p>
                  </div>
                  <div>
                    <p className="text-white/70 font-medium mb-1">Unstaking</p>
                    <p>Withdraw your staked tokens at any time without penalties.</p>
                  </div>
                  <div>
                    <p className="text-white/70 font-medium mb-1">Rewards</p>
                    <p>Claim your earned rewards whenever you want.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Error Toast */}
      {showError && error && (
        <div className="fixed bottom-6 right-6 max-w-sm px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 backdrop-blur-xl animate-slideUp">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-white/80">{error}</p>
            <button onClick={() => setShowError(false)} className="text-white/40 hover:text-white/60">
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
