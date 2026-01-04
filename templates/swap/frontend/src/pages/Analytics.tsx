import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Activity, DollarSign, Layers } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Analytics = () => {
  const { volumeData, tvlData, tokenStats, poolStats, platformStats, timeRange, setTimeRange, formatValue, formatNumber } = useAnalytics();

  const volumeChartData = volumeData.map((d) => ({ date: d.timestamp.toLocaleDateString(), volume: d.volume }));
  const tvlChartData = tvlData.map((d) => ({ date: d.timestamp.toLocaleDateString(), tvl: d.tvl }));

  const StatCard = ({ icon: Icon, label, value, change }: { icon: any; label: string; value: string; change: number }) => (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="font-mono font-bold text-2xl">{value}</div>
      <div className={`text-sm flex items-center gap-1 ${change >= 0 ? "text-success" : "text-destructive"}`}>
        {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change >= 0 ? "+" : ""}{change.toFixed(1)}%
      </div>
    </div>
  );

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
            <p className="text-muted-foreground">Platform metrics and performance</p>
          </div>
          <div className="flex gap-2">
            {(["7D", "30D", "90D", "1Y"] as const).map((range) => (
              <Button key={range} variant={timeRange === range ? "default" : "outline"} size="sm" onClick={() => setTimeRange(range)}>
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Layers} label="Total TVL" value={formatValue(platformStats.totalTVL)} change={platformStats.tvlChange24h} />
          <StatCard icon={Activity} label="24h Volume" value={formatValue(platformStats.volume24h)} change={platformStats.volumeChange24h} />
          <StatCard icon={DollarSign} label="24h Fees" value={formatValue(platformStats.totalFees24h)} change={platformStats.feesChange24h} />
          <StatCard icon={Users} label="Active Users" value={formatNumber(platformStats.activeUsers24h)} change={platformStats.usersChange24h} />
          <StatCard icon={Activity} label="24h Trades" value={formatNumber(platformStats.totalTrades24h)} change={platformStats.tradesChange24h} />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Volume</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={volumeChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [formatValue(v), "Volume"]} />
                <Bar dataKey="volume" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Total Value Locked</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tvlChartData}>
                <defs>
                  <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [formatValue(v), "TVL"]} />
                <Area type="monotone" dataKey="tvl" stroke="#8b5cf6" fill="url(#tvlGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Top Tokens</h3>
            <div className="space-y-2">
              {tokenStats.map((token, idx) => (
                <div key={token.symbol} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4">{idx + 1}</span>
                    <span className="text-xl">{token.icon}</span>
                    <div>
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="text-xs text-muted-foreground">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{formatValue(token.volume24h)}</div>
                    <div className={`text-xs ${token.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                      {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Top Pools</h3>
            <div className="space-y-2">
              {poolStats.map((pool, idx) => (
                <div key={pool.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4">{idx + 1}</span>
                    <div className="flex -space-x-1">
                      <span className="text-lg">{pool.token0Icon}</span>
                      <span className="text-lg">{pool.token1Icon}</span>
                    </div>
                    <div className="font-mono font-semibold">{pool.pair}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{formatValue(pool.tvl)}</div>
                    <div className="text-xs text-success">{pool.apr.toFixed(1)}% APR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
};

export default Analytics;
