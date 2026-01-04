import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { Pool } from "@/types/pool";

interface AddLiquidityModalProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddLiquidityModal = ({ pool, isOpen, onClose }: AddLiquidityModalProps) => {
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [slippage, setSlippage] = useState(0.5);

  if (!pool) return null;

  const estimatedLPTokens = token0Amount ? (parseFloat(token0Amount) * 125.4).toFixed(2) : "0";
  const priceImpact = token0Amount ? Math.min(parseFloat(token0Amount) * 0.02, 5).toFixed(2) : "0";

  const handleToken0Change = (value: string) => {
    setToken0Amount(value);
    if (value) {
      setToken1Amount((parseFloat(value) * 1850).toFixed(2));
    } else {
      setToken1Amount("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <span className="text-xl bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                {pool.token0.icon}
              </span>
              <span className="text-xl bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                {pool.token1.icon}
              </span>
            </div>
            Add Liquidity to {pool.token0.symbol}/{pool.token1.symbol}
          </DialogTitle>
          <DialogDescription>
            Provide liquidity to earn {pool.apr.toFixed(1)}% APR from trading fees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Token 0 Input */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Deposit</span>
              <span className="text-xs text-muted-foreground">Balance: 4.52 {pool.token0.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pool.token0.icon}</span>
              <Input
                type="number"
                placeholder="0.0"
                value={token0Amount}
                onChange={(e) => handleToken0Change(e.target.value)}
                className="flex-1 text-xl font-mono bg-transparent border-none text-right focus-visible:ring-0"
              />
              <span className="font-mono font-semibold">{pool.token0.symbol}</span>
            </div>
          </div>

          {/* Token 1 Input */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Deposit</span>
              <span className="text-xs text-muted-foreground">Balance: 8,420 {pool.token1.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pool.token1.icon}</span>
              <Input
                type="number"
                placeholder="0.0"
                value={token1Amount}
                onChange={(e) => setToken1Amount(e.target.value)}
                className="flex-1 text-xl font-mono bg-transparent border-none text-right focus-visible:ring-0"
              />
              <span className="font-mono font-semibold">{pool.token1.symbol}</span>
            </div>
          </div>

          {/* Slippage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Slippage Tolerance</span>
              <span className="font-mono text-sm">{slippage}%</span>
            </div>
            <Slider
              value={[slippage]}
              onValueChange={([value]) => setSlippage(value)}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Estimates */}
          <div className="glass-card rounded-xl p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Est. LP Tokens</span>
              <span className="font-mono">{estimatedLPTokens}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                Price Impact <Info className="h-3 w-3" />
              </span>
              <span className={`font-mono ${parseFloat(priceImpact) > 2 ? "text-warning" : "text-success"}`}>
                {priceImpact}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Share of Pool</span>
              <span className="font-mono">~0.002%</span>
            </div>
          </div>

          {parseFloat(priceImpact) > 2 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>High price impact. Consider reducing the amount.</span>
            </motion.div>
          )}

          <Button
            variant="swap"
            size="lg"
            className="w-full"
            disabled={!token0Amount || !token1Amount}
          >
            Add Liquidity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
