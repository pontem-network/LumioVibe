import { motion } from "framer-motion";
import { Droplet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pool } from "@/types/pool";

interface PoolCardProps {
  pool: Pool;
  index: number;
  formatValue: (value: number) => string;
  onAddLiquidity: (pool: Pool) => void;
}

export const PoolCard = ({ pool, index, formatValue, onAddLiquidity }: PoolCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl p-5 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <span className="text-2xl bg-muted rounded-full w-10 h-10 flex items-center justify-center border-2 border-background">
              {pool.token0.icon}
            </span>
            <span className="text-2xl bg-muted rounded-full w-10 h-10 flex items-center justify-center border-2 border-background">
              {pool.token1.icon}
            </span>
          </div>
          <div>
            <div className="font-mono font-bold text-lg">
              {pool.token0.symbol}/{pool.token1.symbol}
            </div>
            <div className="text-xs text-muted-foreground">
              {pool.token0.name} / {pool.token1.name}
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-mono ${
            pool.change24h >= 0 ? "text-success" : "text-destructive"
          }`}
        >
          {pool.change24h >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {pool.change24h > 0 ? "+" : ""}
          {pool.change24h.toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Droplet className="h-3 w-3" />
            TVL
          </div>
          <div className="font-mono font-semibold">{formatValue(pool.tvl)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">APR</div>
          <div className="font-mono font-semibold text-success">{pool.apr.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
          <div className="font-mono text-sm">{formatValue(pool.volume24h)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">24h Fees</div>
          <div className="font-mono text-sm">{formatValue(pool.fees24h)}</div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 opacity-80 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onAddLiquidity(pool);
        }}
      >
        <Plus className="h-4 w-4" />
        Add Liquidity
      </Button>
    </motion.div>
  );
};
