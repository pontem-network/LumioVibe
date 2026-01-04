import { useState, useMemo, useCallback, useEffect } from "react";
import { useSwapContract, PoolInfo } from "./useSwapContract";
import { usePontem } from "./usePontem";
import type { Pool, UserPosition } from "@/types/pool";

// Token metadata for display
const TOKEN_META: Record<string, { name: string; icon: string }> = {
  "ETH": { name: "Ethereum", icon: "E" },
  "USDC": { name: "USD Coin", icon: "$" },
  "SOL": { name: "Solana", icon: "S" },
  "APT": { name: "Aptos", icon: "A" },
  "BTC": { name: "Bitcoin", icon: "B" },
  "LUM": { name: "Lumio", icon: "L" },
};

// Mock data for demo mode
const MOCK_POOLS: Pool[] = [
  {
    id: "0",
    token0: { symbol: "ETH", name: "Ethereum", icon: "E" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "$" },
    tvl: 45200000,
    volume24h: 12400000,
    volume7d: 78500000,
    apr: 24.5,
    fees24h: 37200,
    fees7d: 235500,
    change24h: 12.4,
  },
  {
    id: "1",
    token0: { symbol: "LUM", name: "Lumio", icon: "L" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "$" },
    tvl: 18700000,
    volume24h: 8200000,
    volume7d: 52300000,
    apr: 32.1,
    fees24h: 24600,
    fees7d: 156900,
    change24h: 8.2,
  },
];

const MOCK_USER_POSITIONS: UserPosition[] = [];

type SortField = "tvl" | "apr" | "volume24h" | "fees24h";
type SortDirection = "asc" | "desc";

export const usePools = () => {
  const { connected, account } = usePontem();
  const { getPoolCount, getPoolInfo, getLpBalance, isInitialized } = useSwapContract();

  const [pools, setPools] = useState<Pool[]>(MOCK_POOLS);
  const [userPositions, setUserPositions] = useState<UserPosition[]>(MOCK_USER_POSITIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [dexInitialized, setDexInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if DEX is initialized and load pools from contract
  const loadPools = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[usePools] Loading pools...');
      const initialized = await isInitialized();
      console.log('[usePools] DEX initialized:', initialized);
      setDexInitialized(initialized);

      if (!initialized) {
        console.log('[usePools] Using mock pools - DEX not initialized');
        setPools(MOCK_POOLS);
        setUserPositions(MOCK_USER_POSITIONS);
        return;
      }

      const poolCount = await getPoolCount();
      console.log('[usePools] Pool count:', poolCount);
      if (poolCount === 0) {
        console.log('[usePools] Using mock pools - no pools found');
        setPools(MOCK_POOLS);
        return;
      }

      const loadedPools: Pool[] = [];
      const loadedPositions: UserPosition[] = [];

      for (let i = 0; i < poolCount; i++) {
        const poolInfo = await getPoolInfo(i);
        console.log(`[usePools] Pool ${i} info:`, poolInfo);
        if (poolInfo) {
          const token0Meta = TOKEN_META[poolInfo.token0Symbol] || { name: poolInfo.token0Symbol, icon: poolInfo.token0Symbol[0] };
          const token1Meta = TOKEN_META[poolInfo.token1Symbol] || { name: poolInfo.token1Symbol, icon: poolInfo.token1Symbol[0] };

          // Calculate TVL (simplified - would need price oracle in production)
          const tvl = poolInfo.reserve0 + poolInfo.reserve1;
          const apr = tvl > 0 ? (poolInfo.feesCollected * 365 * 100) / tvl : 0;

          const pool: Pool = {
            id: String(i),
            token0: { symbol: poolInfo.token0Symbol, name: token0Meta.name, icon: token0Meta.icon },
            token1: { symbol: poolInfo.token1Symbol, name: token1Meta.name, icon: token1Meta.icon },
            tvl,
            volume24h: poolInfo.volume24h,
            volume7d: poolInfo.volume24h * 7,
            apr,
            fees24h: poolInfo.feesCollected,
            fees7d: poolInfo.feesCollected * 7,
            change24h: 0,
          };

          loadedPools.push(pool);

          // Load user position if connected
          if (account) {
            const lpBalance = await getLpBalance(account, i);
            if (lpBalance > 0) {
              const sharePercent = poolInfo.totalLpSupply > 0 ? lpBalance / poolInfo.totalLpSupply : 0;
              loadedPositions.push({
                poolId: String(i),
                pool,
                lpTokens: lpBalance,
                sharePercent,
                valueUSD: tvl * sharePercent,
                token0Amount: poolInfo.reserve0 * sharePercent,
                token1Amount: poolInfo.reserve1 * sharePercent,
                unclaimedFees: poolInfo.feesCollected * sharePercent,
              });
            }
          }
        }
      }

      setPools(loadedPools.length > 0 ? loadedPools : MOCK_POOLS);
      setUserPositions(loadedPositions);
    } catch (e) {
      console.error("Failed to load pools:", e);
      setPools(MOCK_POOLS);
    } finally {
      setIsLoading(false);
    }
  }, [getPoolCount, getPoolInfo, getLpBalance, isInitialized, account]);

  // Load pools on mount and when account changes
  useEffect(() => {
    loadPools();
  }, [loadPools]);

  const sortedPools = useMemo(() => {
    let filtered = pools;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = pools.filter(
        (pool) =>
          pool.token0.symbol.toLowerCase().includes(query) ||
          pool.token1.symbol.toLowerCase().includes(query) ||
          pool.token0.name.toLowerCase().includes(query) ||
          pool.token1.name.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [pools, sortField, sortDirection, searchQuery]);

  const totalTVL = useMemo(
    () => pools.reduce((sum, pool) => sum + pool.tvl, 0),
    [pools]
  );

  const totalVolume24h = useMemo(
    () => pools.reduce((sum, pool) => sum + pool.volume24h, 0),
    [pools]
  );

  const userTotalValue = useMemo(
    () => userPositions.reduce((sum, pos) => sum + pos.valueUSD, 0),
    [userPositions]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatValue = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return {
    pools: sortedPools,
    userPositions,
    isLoading,
    dexInitialized,
    totalTVL,
    totalVolume24h,
    userTotalValue,
    sortField,
    sortDirection,
    toggleSort,
    searchQuery,
    setSearchQuery,
    formatValue,
    poolCount: pools.length,
    positionCount: userPositions.length,
    refreshPools: loadPools,
  };
};
