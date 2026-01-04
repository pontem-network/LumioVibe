import { motion } from "framer-motion";
import { 
  Layers, 
  TrendingUp, 
  Droplet, 
  Percent, 
  Plus,
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Pool {
  pair: string;
  icons: string[];
  tvl: string;
  volume24h: string;
  apr: string;
  fees24h: string;
  change: number;
}

const topPools: Pool[] = [
  { pair: "ETH/USDC", icons: ["⟠", "💵"], tvl: "$45.2M", volume24h: "$12.4M", apr: "24.5%", fees24h: "$37.2K", change: 12.4 },
  { pair: "SOL/USDC", icons: ["◎", "💵"], tvl: "$18.7M", volume24h: "$8.2M", apr: "32.1%", fees24h: "$24.6K", change: 8.2 },
  { pair: "APT/USDC", icons: ["🔷", "💵"], tvl: "$12.3M", volume24h: "$4.5M", apr: "18.7%", fees24h: "$13.5K", change: -2.4 },
  { pair: "3LD/ETH", icons: ["✦", "⟠"], tvl: "$8.9M", volume24h: "$3.2M", apr: "45.2%", fees24h: "$9.6K", change: 28.5 },
];

export const PoolsOverview = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Top Liquidity Pools
        </h3>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Add Liquidity
        </Button>
      </div>

      <div className="space-y-2">
        {topPools.map((pool, idx) => (
          <motion.div
            key={pool.pair}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {pool.icons.map((icon, i) => (
                  <span 
                    key={i} 
                    className="text-lg bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background"
                  >
                    {icon}
                  </span>
                ))}
              </div>
              <div>
                <div className="font-mono font-semibold text-sm">{pool.pair}</div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Droplet className="h-3 w-3" />
                    {pool.tvl}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted-foreground">24h Vol</div>
                <div className="font-mono text-sm">{pool.volume24h}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">APR</div>
                <div className="font-mono text-sm text-success flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {pool.apr}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-mono ${
                pool.change >= 0 ? "text-success" : "text-destructive"
              }`}>
                <TrendingUp className="h-3 w-3" />
                {pool.change > 0 ? "+" : ""}{pool.change}%
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
