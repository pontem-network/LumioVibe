import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePontem } from "@/hooks/usePontem";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

const Portfolio = () => {
  const { connected } = usePontem();
  const { assets, summary, history, transactions, formatValue, timeRange, setTimeRange } = usePortfolio();

  const COLORS = ["#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#64748b"];

  if (!connected) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect a wallet to view your portfolio</p>
          <Button variant="swap">Connect Wallet</Button>
        </div>
      </PageLayout>
    );
  }

  const chartData = history.map((h) => ({ date: h.timestamp.toLocaleDateString(), value: h.value }));

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Total Portfolio Value</p>
            <h1 className="text-4xl font-bold font-mono">{formatValue(summary.totalValue)}</h1>
            <p className={`text-sm ${summary.changePercent24h >= 0 ? "text-success" : "text-destructive"}`}>
              {summary.changePercent24h >= 0 ? "+" : ""}{summary.changePercent24h.toFixed(2)}% (24h)
            </p>
          </div>
          <div className="flex gap-2">
            {(["1D", "7D", "30D", "ALL"] as const).map((range) => (
              <Button key={range} variant={timeRange === range ? "default" : "outline"} size="sm" onClick={() => setTimeRange(range)}>
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Portfolio Value</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Value"]} />
                <Area type="monotone" dataKey="value" stroke="#ec4899" fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Allocation</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={assets} dataKey="allocation" nameKey="symbol" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {assets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Allocation"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assets */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Assets</h3>
          <div className="space-y-3">
            {assets.map((asset, idx) => (
              <motion.div key={asset.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{asset.icon}</span>
                  <div>
                    <div className="font-semibold">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.balance.toFixed(4)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{formatValue(asset.value)}</div>
                  <div className={`text-xs ${asset.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                    {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30">
                <div>
                  <div className="font-medium capitalize">{tx.type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{tx.timestamp.toLocaleDateString()}</div>
                </div>
                <div className="text-right font-mono">{formatValue(tx.valueUSD)}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default Portfolio;
