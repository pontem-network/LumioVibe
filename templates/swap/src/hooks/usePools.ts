import { useState, useMemo } from "react";
import type { Pool, UserPosition } from "@/types/pool";

const MOCK_POOLS: Pool[] = [
  {
    id: "eth-usdc",
    token0: { symbol: "ETH", name: "Ethereum", icon: "⟠" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "💵" },
    tvl: 45200000,
    volume24h: 12400000,
    volume7d: 78500000,
    apr: 24.5,
    fees24h: 37200,
    fees7d: 235500,
    change24h: 12.4,
  },
  {
    id: "sol-usdc",
    token0: { symbol: "SOL", name: "Solana", icon: "◎" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "💵" },
    tvl: 18700000,
    volume24h: 8200000,
    volume7d: 52300000,
    apr: 32.1,
    fees24h: 24600,
    fees7d: 156900,
    change24h: 8.2,
  },
  {
    id: "apt-usdc",
    token0: { symbol: "APT", name: "Aptos", icon: "🔷" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "💵" },
    tvl: 12300000,
    volume24h: 4500000,
    volume7d: 28700000,
    apr: 18.7,
    fees24h: 13500,
    fees7d: 86100,
    change24h: -2.4,
  },
  {
    id: "3ld-eth",
    token0: { symbol: "3LD", name: "3LD Token", icon: "✦" },
    token1: { symbol: "ETH", name: "Ethereum", icon: "⟠" },
    tvl: 8900000,
    volume24h: 3200000,
    volume7d: 19800000,
    apr: 45.2,
    fees24h: 9600,
    fees7d: 59400,
    change24h: 28.5,
  },
  {
    id: "btc-usdc",
    token0: { symbol: "BTC", name: "Bitcoin", icon: "₿" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "💵" },
    tvl: 67500000,
    volume24h: 24800000,
    volume7d: 156200000,
    apr: 15.8,
    fees24h: 74400,
    fees7d: 468600,
    change24h: 5.2,
  },
  {
    id: "eth-btc",
    token0: { symbol: "ETH", name: "Ethereum", icon: "⟠" },
    token1: { symbol: "BTC", name: "Bitcoin", icon: "₿" },
    tvl: 34200000,
    volume24h: 9800000,
    volume7d: 62400000,
    apr: 12.4,
    fees24h: 29400,
    fees7d: 187200,
    change24h: -1.8,
  },
  {
    id: "3ld-usdc",
    token0: { symbol: "3LD", name: "3LD Token", icon: "✦" },
    token1: { symbol: "USDC", name: "USD Coin", icon: "💵" },
    tvl: 5600000,
    volume24h: 2100000,
    volume7d: 12800000,
    apr: 52.3,
    fees24h: 6300,
    fees7d: 38400,
    change24h: 34.2,
  },
  {
    id: "sol-eth",
    token0: { symbol: "SOL", name: "Solana", icon: "◎" },
    token1: { symbol: "ETH", name: "Ethereum", icon: "⟠" },
    tvl: 9800000,
    volume24h: 3600000,
    volume7d: 22100000,
    apr: 28.6,
    fees24h: 10800,
    fees7d: 66300,
    change24h: 6.8,
  },
];

const MOCK_USER_POSITIONS: UserPosition[] = [
  {
    poolId: "eth-usdc",
    pool: MOCK_POOLS[0],
    lpTokens: 1250.5,
    sharePercent: 0.0028,
    valueUSD: 12650,
    token0Amount: 3.42,
    token1Amount: 6325,
    unclaimedFees: 45.8,
  },
  {
    poolId: "3ld-eth",
    pool: MOCK_POOLS[3],
    lpTokens: 890.2,
    sharePercent: 0.01,
    valueUSD: 8900,
    token0Amount: 4520,
    token1Amount: 2.1,
    unclaimedFees: 128.4,
  },
];

type SortField = "tvl" | "apr" | "volume24h" | "fees24h";
type SortDirection = "asc" | "desc";

export const usePools = () => {
  const [pools] = useState<Pool[]>(MOCK_POOLS);
  const [userPositions] = useState<UserPosition[]>(MOCK_USER_POSITIONS);
  const [isLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");

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
  };
};
