import { useState, useMemo } from "react";
import type { Asset, Transaction, PortfolioSummary, PortfolioHistory } from "@/types/portfolio";
import { useCryptoPrices } from "./useCryptoPrices";

const MOCK_ASSETS: Asset[] = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: 4.52, price: 3450, value: 15594, change24h: 2.4, allocation: 0 },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: 45.8, price: 178, value: 8152.4, change24h: 5.2, allocation: 0 },
  { symbol: "3LD", name: "3LD Token", icon: "✦", balance: 12500, price: 0.42, value: 5250, change24h: 12.8, allocation: 0 },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: 0.12, price: 98500, value: 11820, change24h: 1.2, allocation: 0 },
  { symbol: "USDC", name: "USD Coin", icon: "💵", balance: 5420, price: 1, value: 5420, change24h: 0, allocation: 0 },
  { symbol: "APT", name: "Aptos", icon: "🔷", balance: 125, price: 12.4, value: 1550, change24h: -3.2, allocation: 0 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    type: "swap",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tokens: { from: { symbol: "ETH", amount: 0.5 }, to: { symbol: "USDC", amount: 1725 } },
    valueUSD: 1725,
    status: "completed",
    txHash: "0x1a2b3c...",
  },
  {
    id: "tx2",
    type: "add_liquidity",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    tokens: { from: { symbol: "ETH", amount: 1.2 }, to: { symbol: "USDC", amount: 4140 } },
    valueUSD: 8280,
    status: "completed",
    txHash: "0x4d5e6f...",
  },
  {
    id: "tx3",
    type: "stake",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    tokens: { from: { symbol: "3LD", amount: 5000 } },
    valueUSD: 2100,
    status: "completed",
    txHash: "0x7g8h9i...",
  },
  {
    id: "tx4",
    type: "swap",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    tokens: { from: { symbol: "SOL", amount: 10 }, to: { symbol: "3LD", amount: 4200 } },
    valueUSD: 1780,
    status: "completed",
    txHash: "0xjk1lm2...",
  },
  {
    id: "tx5",
    type: "remove_liquidity",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    tokens: { from: { symbol: "SOL", amount: 5 }, to: { symbol: "USDC", amount: 890 } },
    valueUSD: 1780,
    status: "completed",
    txHash: "0xno3pq4...",
  },
];

const generateHistoryData = (): PortfolioHistory[] => {
  const data: PortfolioHistory[] = [];
  const now = Date.now();
  const baseValue = 42000;
  
  for (let i = 30; i >= 0; i--) {
    const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
    const randomChange = (Math.random() - 0.45) * 2000;
    const trend = (30 - i) * 150;
    data.push({
      timestamp,
      value: baseValue + trend + randomChange,
    });
  }
  
  return data;
};

export const usePortfolio = () => {
  const { getPrice } = useCryptoPrices();
  const [isLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"1D" | "7D" | "30D" | "ALL">("30D");

  const assets = useMemo(() => {
    const updatedAssets = MOCK_ASSETS.map((asset) => {
      const priceData = getPrice(asset.symbol);
      const price = priceData?.price ?? asset.price;
      const change24h = priceData?.change24h ?? asset.change24h;
      return {
        ...asset,
        price,
        change24h,
        value: asset.balance * price,
      };
    });

    const totalValue = updatedAssets.reduce((sum, a) => sum + a.value, 0);
    return updatedAssets.map((a) => ({
      ...a,
      allocation: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
    }));
  }, [getPrice]);

  const transactions = MOCK_TRANSACTIONS;
  const history = useMemo(() => generateHistoryData(), []);

  const summary: PortfolioSummary = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
    const weightedChange = assets.reduce(
      (sum, a) => sum + (a.change24h * a.allocation) / 100,
      0
    );
    const change24h = (totalValue * weightedChange) / 100;
    
    return {
      totalValue,
      change24h,
      changePercent24h: weightedChange,
      totalPnL: 8420,
      totalPnLPercent: 21.5,
    };
  }, [assets]);

  const topPerformer = useMemo(
    () => assets.reduce((best, a) => (a.change24h > best.change24h ? a : best), assets[0]),
    [assets]
  );

  const worstPerformer = useMemo(
    () => assets.reduce((worst, a) => (a.change24h < worst.change24h ? a : worst), assets[0]),
    [assets]
  );

  const formatValue = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return {
    assets,
    transactions,
    history,
    summary,
    isLoading,
    timeRange,
    setTimeRange,
    topPerformer,
    worstPerformer,
    formatValue,
  };
};
