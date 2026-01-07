import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

interface Trade {
  type: "buy" | "sell";
  amount: string;
  price: string;
  total: string;
  time: string;
  txHash: string;
}

const recentTrades: Trade[] = [
  { type: "buy", amount: "2.5 ETH", price: "$3,421.50", total: "$8,553.75", time: "12s ago", txHash: "0x8f3...2a4b" },
  { type: "sell", amount: "0.8 ETH", price: "$3,419.20", total: "$2,735.36", time: "45s ago", txHash: "0x2c1...9e8f" },
  { type: "buy", amount: "5.0 ETH", price: "$3,420.00", total: "$17,100.00", time: "1m ago", txHash: "0x7d4...3b2c" },
  { type: "buy", amount: "1.2 ETH", price: "$3,422.80", total: "$4,107.36", time: "2m ago", txHash: "0x4e5...1a9d" },
  { type: "sell", amount: "3.0 ETH", price: "$3,418.50", total: "$10,255.50", time: "3m ago", txHash: "0x9f2...7c4e" },
  { type: "buy", amount: "0.5 ETH", price: "$3,423.00", total: "$1,711.50", time: "4m ago", txHash: "0x1b8...5d3f" },
];

export const RecentTrades = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Trades</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left pb-3">Type</th>
              <th className="text-right pb-3">Amount</th>
              <th className="text-right pb-3">Price</th>
              <th className="text-right pb-3">Total</th>
              <th className="text-right pb-3">Time</th>
              <th className="text-right pb-3">Tx</th>
            </tr>
          </thead>
          <tbody>
            {recentTrades.map((trade, idx) => (
              <motion.tr
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-t border-border/50"
              >
                <td className="py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    trade.type === "buy" ? "text-success" : "text-destructive"
                  }`}>
                    {trade.type === "buy" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 text-right font-mono text-xs">{trade.amount}</td>
                <td className="py-3 text-right font-mono text-xs">{trade.price}</td>
                <td className="py-3 text-right font-mono text-xs font-medium">{trade.total}</td>
                <td className="py-3 text-right text-xs text-muted-foreground">{trade.time}</td>
                <td className="py-3 text-right">
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {trade.txHash}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
