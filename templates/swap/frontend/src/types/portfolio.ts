export interface Asset {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
  allocation: number;
}

export interface Transaction {
  id: string;
  type: "swap" | "add_liquidity" | "remove_liquidity" | "stake" | "unstake" | "transfer";
  timestamp: Date;
  tokens: {
    from?: { symbol: string; amount: number };
    to?: { symbol: string; amount: number };
  };
  valueUSD: number;
  status: "completed" | "pending" | "failed";
  txHash: string;
}

export interface PortfolioSummary {
  totalValue: number;
  change24h: number;
  changePercent24h: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export interface PortfolioHistory {
  timestamp: Date;
  value: number;
}
