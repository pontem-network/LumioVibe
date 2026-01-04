export interface VolumeData {
  timestamp: Date;
  volume: number;
}

export interface TVLData {
  timestamp: Date;
  tvl: number;
}

export interface TokenStats {
  symbol: string;
  name: string;
  icon: string;
  price: number;
  change24h: number;
  volume24h: number;
  tvl: number;
  trades24h: number;
}

export interface PoolStats {
  id: string;
  pair: string;
  token0Icon: string;
  token1Icon: string;
  tvl: number;
  volume24h: number;
  fees7d: number;
  apr: number;
}

export interface PlatformStats {
  totalTVL: number;
  tvlChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  totalFees24h: number;
  feesChange24h: number;
  activeUsers24h: number;
  usersChange24h: number;
  totalTrades24h: number;
  tradesChange24h: number;
}

export interface FeesData {
  timestamp: Date;
  fees: number;
  cumulative: number;
}
