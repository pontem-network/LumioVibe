import { useState, useMemo } from "react";
import type { VolumeData, TVLData, TokenStats, PoolStats, PlatformStats, FeesData } from "@/types/analytics";

const generateVolumeData = (days: number): VolumeData[] => {
  const data: VolumeData[] = [];
  const now = Date.now();
  const baseVolume = 45000000;

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = timestamp.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;
    const randomFactor = 0.7 + Math.random() * 0.6;
    const trend = (days - i) * 500000;
    data.push({
      timestamp,
      volume: (baseVolume + trend) * weekendFactor * randomFactor,
    });
  }

  return data;
};

const generateTVLData = (days: number): TVLData[] => {
  const data: TVLData[] = [];
  const now = Date.now();
  const baseTVL = 180000000;

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
    const trend = (days - i) * 2000000;
    const randomChange = (Math.random() - 0.45) * 5000000;
    data.push({
      timestamp,
      tvl: baseTVL + trend + randomChange,
    });
  }

  return data;
};

const generateFeesData = (days: number): FeesData[] => {
  const data: FeesData[] = [];
  const now = Date.now();
  let cumulative = 0;

  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
    const dailyFees = 120000 + Math.random() * 80000;
    cumulative += dailyFees;
    data.push({
      timestamp,
      fees: dailyFees,
      cumulative,
    });
  }

  return data;
};

const MOCK_TOKEN_STATS: TokenStats[] = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", price: 3450, change24h: 2.4, volume24h: 24800000, tvl: 79400000, trades24h: 12450 },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", price: 98500, change24h: 1.2, volume24h: 34600000, tvl: 101700000, trades24h: 8920 },
  { symbol: "SOL", name: "Solana", icon: "◎", price: 178, change24h: 5.2, volume24h: 11800000, tvl: 28500000, trades24h: 15680 },
  { symbol: "3LD", name: "3LD Token", icon: "✦", price: 0.42, change24h: 12.8, volume24h: 5300000, tvl: 14500000, trades24h: 28450 },
  { symbol: "APT", name: "Aptos", icon: "🔷", price: 12.4, change24h: -3.2, volume24h: 4500000, tvl: 12300000, trades24h: 6780 },
  { symbol: "USDC", name: "USD Coin", icon: "💵", price: 1, change24h: 0, volume24h: 45200000, tvl: 56800000, trades24h: 42350 },
];

const MOCK_POOL_STATS: PoolStats[] = [
  { id: "btc-usdc", pair: "BTC/USDC", token0Icon: "₿", token1Icon: "💵", tvl: 67500000, volume24h: 24800000, fees7d: 468600, apr: 15.8 },
  { id: "eth-usdc", pair: "ETH/USDC", token0Icon: "⟠", token1Icon: "💵", tvl: 45200000, volume24h: 12400000, fees7d: 235500, apr: 24.5 },
  { id: "eth-btc", pair: "ETH/BTC", token0Icon: "⟠", token1Icon: "₿", tvl: 34200000, volume24h: 9800000, fees7d: 187200, apr: 12.4 },
  { id: "sol-usdc", pair: "SOL/USDC", token0Icon: "◎", token1Icon: "💵", tvl: 18700000, volume24h: 8200000, fees7d: 156900, apr: 32.1 },
  { id: "apt-usdc", pair: "APT/USDC", token0Icon: "🔷", token1Icon: "💵", tvl: 12300000, volume24h: 4500000, fees7d: 86100, apr: 18.7 },
];

const PLATFORM_STATS: PlatformStats = {
  totalTVL: 245800000,
  tvlChange24h: 4.2,
  volume24h: 78500000,
  volumeChange24h: 12.8,
  totalFees24h: 235500,
  feesChange24h: 8.4,
  activeUsers24h: 12450,
  usersChange24h: 15.2,
  totalTrades24h: 89450,
  tradesChange24h: 22.1,
};

export const useAnalytics = () => {
  const [isLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");

  const days = useMemo(() => {
    switch (timeRange) {
      case "7D": return 7;
      case "30D": return 30;
      case "90D": return 90;
      case "1Y": return 365;
      default: return 30;
    }
  }, [timeRange]);

  const volumeData = useMemo(() => generateVolumeData(days), [days]);
  const tvlData = useMemo(() => generateTVLData(days), [days]);
  const feesData = useMemo(() => generateFeesData(days), [days]);

  const tokenStats = MOCK_TOKEN_STATS;
  const poolStats = MOCK_POOL_STATS;
  const platformStats = PLATFORM_STATS;

  const formatValue = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(0);
  };

  return {
    volumeData,
    tvlData,
    feesData,
    tokenStats,
    poolStats,
    platformStats,
    isLoading,
    timeRange,
    setTimeRange,
    formatValue,
    formatNumber,
  };
};
