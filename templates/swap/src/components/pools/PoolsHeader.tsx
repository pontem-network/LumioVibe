import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PoolsHeaderProps {
  poolCount: number;
  totalTVL: string;
  totalVolume: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const PoolsHeader = ({
  poolCount,
  totalTVL,
  totalVolume,
  searchQuery,
  onSearchChange,
}: PoolsHeaderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Liquidity Pools</h1>
          <p className="text-muted-foreground mt-1">
            Provide liquidity and earn fees from trades
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="glass-card rounded-xl px-4 py-2">
            <div className="text-xs text-muted-foreground">Total TVL</div>
            <div className="font-mono font-bold text-lg">{totalTVL}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-2">
            <div className="text-xs text-muted-foreground">24h Volume</div>
            <div className="font-mono font-bold text-lg">{totalVolume}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pools by token..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <div className="text-sm text-muted-foreground">
          {poolCount} pools
        </div>
      </div>
    </div>
  );
};
