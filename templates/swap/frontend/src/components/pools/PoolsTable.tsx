import { motion } from "framer-motion";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pool } from "@/types/pool";

interface PoolsTableProps {
  pools: Pool[];
  sortField: "tvl" | "apr" | "volume24h" | "fees24h";
  sortDirection: "asc" | "desc";
  onSort: (field: "tvl" | "apr" | "volume24h" | "fees24h") => void;
  formatValue: (value: number) => string;
  onSelectPool: (pool: Pool) => void;
}

export const PoolsTable = ({
  pools,
  sortField,
  sortDirection,
  onSort,
  formatValue,
  onSelectPool,
}: PoolsTableProps) => {
  const SortHeader = ({
    field,
    children,
  }: {
    field: "tvl" | "apr" | "volume24h" | "fees24h";
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground gap-1"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown
        className={`h-3 w-3 ${sortField === field ? "text-primary" : ""}`}
      />
    </Button>
  );

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[200px]">Pool</TableHead>
            <TableHead className="text-right">
              <SortHeader field="tvl">TVL</SortHeader>
            </TableHead>
            <TableHead className="text-right hidden md:table-cell">
              <SortHeader field="volume24h">24h Volume</SortHeader>
            </TableHead>
            <TableHead className="text-right hidden lg:table-cell">7d Volume</TableHead>
            <TableHead className="text-right">
              <SortHeader field="apr">APR</SortHeader>
            </TableHead>
            <TableHead className="text-right hidden sm:table-cell">
              <SortHeader field="fees24h">24h Fees</SortHeader>
            </TableHead>
            <TableHead className="text-right">24h Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.map((pool, idx) => (
            <motion.tr
              key={pool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectPool(pool)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="text-lg bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                      {pool.token0.icon}
                    </span>
                    <span className="text-lg bg-muted rounded-full w-8 h-8 flex items-center justify-center border-2 border-background">
                      {pool.token1.icon}
                    </span>
                  </div>
                  <div>
                    <div className="font-mono font-semibold">
                      {pool.token0.symbol}/{pool.token1.symbol}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pool.token0.name}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatValue(pool.tvl)}
              </TableCell>
              <TableCell className="text-right font-mono hidden md:table-cell">
                {formatValue(pool.volume24h)}
              </TableCell>
              <TableCell className="text-right font-mono hidden lg:table-cell">
                {formatValue(pool.volume7d)}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono text-success">{pool.apr.toFixed(1)}%</span>
              </TableCell>
              <TableCell className="text-right font-mono hidden sm:table-cell">
                {formatValue(pool.fees24h)}
              </TableCell>
              <TableCell className="text-right">
                <div
                  className={`flex items-center justify-end gap-1 font-mono text-sm ${
                    pool.change24h >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {pool.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {pool.change24h > 0 ? "+" : ""}
                  {pool.change24h.toFixed(1)}%
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
