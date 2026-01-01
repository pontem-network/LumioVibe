import { motion } from "framer-motion";
import { Wallet, TrendingUp, Gift, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserPosition } from "@/types/pool";

interface MyPositionsProps {
  positions: UserPosition[];
  formatValue: (value: number) => string;
  onRemoveLiquidity: (position: UserPosition) => void;
}

export const MyPositions = ({ positions, formatValue, onRemoveLiquidity }: MyPositionsProps) => {
  const totalValue = positions.reduce((sum, p) => sum + p.valueUSD, 0);
  const totalFees = positions.reduce((sum, p) => sum + p.unclaimedFees, 0);

  if (positions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Positions Yet</h3>
        <p className="text-muted-foreground mb-4">
          Add liquidity to a pool to start earning fees
        </p>
        <Button variant="outline">Explore Pools</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Value</div>
          <div className="font-mono font-bold text-xl">{formatValue(totalValue)}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Positions</div>
          <div className="font-mono font-bold text-xl">{positions.length}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Unclaimed Fees</div>
          <div className="font-mono font-bold text-xl text-success">{formatValue(totalFees)}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Avg. APR</div>
          <div className="font-mono font-bold text-xl text-success">32.4%</div>
        </div>
      </div>

      {/* Position Cards */}
      <div className="space-y-3">
        {positions.map((position, idx) => (
          <motion.div
            key={position.poolId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="text-xl bg-muted rounded-full w-10 h-10 flex items-center justify-center border-2 border-background">
                    {position.pool.token0.icon}
                  </span>
                  <span className="text-xl bg-muted rounded-full w-10 h-10 flex items-center justify-center border-2 border-background">
                    {position.pool.token1.icon}
                  </span>
                </div>
                <div>
                  <div className="font-mono font-bold">
                    {position.pool.token0.symbol}/{position.pool.token1.symbol}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{position.sharePercent.toFixed(4)}% share</span>
                    <span>•</span>
                    <span className="text-success">{position.pool.apr.toFixed(1)}% APR</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-lg">{formatValue(position.valueUSD)}</div>
                <div className="text-xs text-muted-foreground">
                  {position.lpTokens.toFixed(2)} LP tokens
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase">
                  {position.pool.token0.symbol}
                </div>
                <div className="font-mono text-sm">{position.token0Amount.toFixed(4)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase">
                  {position.pool.token1.symbol}
                </div>
                <div className="font-mono text-sm">{position.token1Amount.toFixed(2)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Unclaimed
                </div>
                <div className="font-mono text-sm text-success">
                  {formatValue(position.unclaimedFees)}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Pool TVL
                </div>
                <div className="font-mono text-sm">{formatValue(position.pool.tvl)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1">
                <Gift className="h-3 w-3" />
                Claim Fees
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onRemoveLiquidity(position)}
              >
                Remove
              </Button>
              <Button variant="ghost" size="icon-sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
