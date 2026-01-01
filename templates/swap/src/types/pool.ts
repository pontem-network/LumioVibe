export interface Pool {
  id: string;
  token0: {
    symbol: string;
    name: string;
    icon: string;
  };
  token1: {
    symbol: string;
    name: string;
    icon: string;
  };
  tvl: number;
  volume24h: number;
  volume7d: number;
  apr: number;
  fees24h: number;
  fees7d: number;
  change24h: number;
}

export interface UserPosition {
  poolId: string;
  pool: Pool;
  lpTokens: number;
  sharePercent: number;
  valueUSD: number;
  token0Amount: number;
  token1Amount: number;
  unclaimedFees: number;
}

export interface AddLiquidityParams {
  poolId: string;
  token0Amount: number;
  token1Amount: number;
  slippageTolerance: number;
}

export interface RemoveLiquidityParams {
  poolId: string;
  percentage: number;
  lpTokens: number;
}
