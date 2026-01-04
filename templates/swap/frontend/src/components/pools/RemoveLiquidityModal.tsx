import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { UserPosition } from "@/types/pool";

interface RemoveLiquidityModalProps {
  position: UserPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RemoveLiquidityModal = ({ position, isOpen, onClose }: RemoveLiquidityModalProps) => {
  const [percentage, setPercentage] = useState(50);

  if (!position) return null;

  const token0ToReceive = (position.token0Amount * percentage) / 100;
  const token1ToReceive = (position.token1Amount * percentage) / 100;
  const valueToReceive = (position.valueUSD * percentage) / 100;

  const presets = [25, 50, 75, 100];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <span className="text-xl bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                {position.pool.token0.icon}
              </span>
              <span className="text-xl bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                {position.pool.token1.icon}
              </span>
            </div>
            Remove Liquidity
          </DialogTitle>
          <DialogDescription>
            Remove your liquidity from {position.pool.token0.symbol}/{position.pool.token1.symbol}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Percentage Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount to Remove</span>
              <span className="font-mono text-2xl font-bold">{percentage}%</span>
            </div>
            
            <Slider
              value={[percentage]}
              onValueChange={([value]) => setPercentage(value)}
              max={100}
              step={1}
              className="w-full"
            />

            <div className="flex gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  variant={percentage === preset ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPercentage(preset)}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          {/* Receive Summary */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="text-sm text-muted-foreground mb-2">You will receive</div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{position.pool.token0.icon}</span>
                <span className="font-medium">{position.pool.token0.symbol}</span>
              </div>
              <span className="font-mono font-semibold">{token0ToReceive.toFixed(4)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{position.pool.token1.icon}</span>
                <span className="font-medium">{position.pool.token1.symbol}</span>
              </div>
              <span className="font-mono font-semibold">{token1ToReceive.toFixed(2)}</span>
            </div>

            <div className="border-t border-border/50 pt-3 flex items-center justify-between">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-mono font-bold text-lg">${valueToReceive.toFixed(2)}</span>
            </div>
          </div>

          {/* Position Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>LP Tokens to Burn</span>
              <span className="font-mono">{((position.lpTokens * percentage) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining Position</span>
              <span className="font-mono">${((position.valueUSD * (100 - percentage)) / 100).toFixed(2)}</span>
            </div>
          </div>

          <Button
            variant="swap"
            size="lg"
            className="w-full"
            disabled={percentage === 0}
          >
            Remove Liquidity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
