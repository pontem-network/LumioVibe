import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, Clock, BarChart3, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

const generateChartData = (days: number, volatility: number = 0.05) => {
  const data = [];
  let price = 3420;
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * volatility * price;
    price = Math.max(price + change, 100);
    const open = price;
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = price + (Math.random() - 0.5) * volatility * price * 0.5;
    const volume = Math.random() * 1000000 + 500000;

    data.push({
      time: new Date(now - i * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(close.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(volume),
      ma20: parseFloat((price * 0.98).toFixed(2)),
    });
  }
  return data;
};

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

export const PriceChart = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [chartType, setChartType] = useState<"line" | "candle">("line");

  const data = useMemo(() => generateChartData(48, 0.03), []);

  const currentPrice = data[data.length - 1]?.price || 0;
  const previousPrice = data[data.length - 2]?.price || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  const high24h = Math.max(...data.map(d => d.high));
  const low24h = Math.min(...data.map(d => d.low));
  const volume24h = data.reduce((acc, d) => acc + d.volume, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-5 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⟠</span>
            <h2 className="text-xl font-bold font-mono">ETH/USDC</h2>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{priceChangePercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">${currentPrice.toLocaleString()}</span>
            <span className={`text-sm font-mono ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? "+" : ""}{priceChange.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setChartType("line")}
            >
              <LineChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "candle" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setChartType("candle")}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="24h High" value={`$${high24h.toLocaleString()}`} />
        <StatCard label="24h Low" value={`$${low24h.toLocaleString()}`} />
        <StatCard label="24h Volume" value={`$${(volume24h / 1000000).toFixed(2)}M`} />
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-1 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground mr-2" />
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTimeframe === tf
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 h-[300px] min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "line" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270, 70%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(270, 70%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 50', 'dataMax + 50']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                orientation="right"
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={currentPrice} stroke="hsl(270, 70%, 50%)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(270, 70%, 50%)"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
              <Line
                type="monotone"
                dataKey="ma20"
                stroke="hsl(0, 85%, 70%)"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          ) : (
            <ComposedChart data={data}>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
              />
              <YAxis
                yAxisId="price"
                domain={['dataMin - 50', 'dataMax + 50']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                orientation="right"
                tickFormatter={(val) => `$${val}`}
              />
              <YAxis
                yAxisId="volume"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="hsl(270, 70%, 50%)"
                opacity={0.2}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="hsl(270, 70%, 50%)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 bg-muted/30 rounded-xl">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className="font-mono font-semibold text-sm">{value}</div>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="glass-card rounded-lg p-3 text-xs">
      <div className="font-mono text-muted-foreground mb-2">{data.time}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-mono font-semibold">${data.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono">${(data.volume / 1000).toFixed(0)}K</span>
        </div>
      </div>
    </div>
  );
};
