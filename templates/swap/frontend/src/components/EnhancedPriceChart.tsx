import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  AreaChart,
  CartesianGrid,
  Brush
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BarChart3, 
  LineChart, 
  Pencil,
  Crosshair,
  TrendingUp as TrendIcon,
  Minus,
  Square,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectedCoin } from "@/types/coin";
import { TokenIcon } from "@/components/TokenIcon";

const generateChartData = (days: number, volatility: number = 0.05, basePrice: number = 3420) => {
  const data = [];
  let price = basePrice;
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * volatility * price;
    price = Math.max(price + change, basePrice * 0.01);
    const open = price;
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = price + (Math.random() - 0.5) * volatility * price * 0.5;
    const volume = Math.random() * 1000000 + 500000;
    
    data.push({
      time: new Date(now - i * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullTime: new Date(now - i * 3600000).toLocaleString(),
      price: parseFloat(close.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(volume),
      ma20: parseFloat((price * 0.98).toFixed(2)),
      ma50: parseFloat((price * 0.96).toFixed(2)),
    });
  }
  return data;
};

const parsePrice = (priceString: string): number => {
  const cleaned = priceString.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 100;
};

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

const drawingTools = [
  { id: "crosshair", icon: Crosshair, label: "Crosshair" },
  { id: "trendline", icon: TrendIcon, label: "Trend Line" },
  { id: "horizontal", icon: Minus, label: "Horizontal Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
];

interface EnhancedPriceChartProps {
  selectedCoin?: SelectedCoin;
}

export const EnhancedPriceChart = ({ selectedCoin }: EnhancedPriceChartProps) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  const coin = selectedCoin || {
    symbol: "ETH",
    name: "Ethereum",
    icon: "⟠",
    price: "$3,420",
    change: 1.87
  };

  // Regenerate chart data when coin changes
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [coin.symbol]);
  
  const basePrice = parsePrice(coin.price);
  const data = useMemo(() => generateChartData(72, 0.03, basePrice), [basePrice, chartKey]);
  
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
      className="glass-card rounded-2xl p-5 h-full flex flex-col border border-pink/10"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={coin.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <TokenIcon symbol={coin.symbol} size={32} />
              <h2 className="text-xl font-bold font-mono">{coin.symbol}/USDC</h2>
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
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {/* Drawing Tools */}
          <div className="relative">
            <Button
              variant={showDrawingTools ? "default" : "glass"}
              size="icon-sm"
              onClick={() => setShowDrawingTools(!showDrawingTools)}
              className="border border-pink/20"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            
            {showDrawingTools && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full right-0 mt-2 glass-card rounded-xl p-2 z-20 border border-pink/20"
              >
                {drawingTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedTool === tool.id
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <tool.icon className="h-4 w-4" />
                    <span>{tool.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-0.5 border border-pink/10">
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
        <StatCard label="24h High" value={`$${high24h.toLocaleString()}`} positive />
        <StatCard label="24h Low" value={`$${low24h.toLocaleString()}`} />
        <StatCard label="24h Volume" value={`$${(volume24h / 1000000).toFixed(2)}M`} />
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              selectedTimeframe === tf
                ? "bg-gradient-to-r from-primary to-pink text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[350px] relative">
        {selectedTool && (
          <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
            {drawingTools.find(t => t.id === selectedTool)?.label} active
          </div>
        )}
        <ResponsiveContainer width="100%" height={350}>
          {chartType === "line" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270, 70%, 50%)" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(330, 80%, 50%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(270, 70%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(240, 10%, 20%)" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['dataMin - 30', 'dataMax + 30']}
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                orientation="right"
                tickFormatter={(val) => `$${val.toLocaleString()}`}
                width={80}
              />
              <Tooltip content={<EnhancedTooltip coinSymbol={coin.symbol} />} />
              <ReferenceLine 
                y={currentPrice} 
                stroke="hsl(330, 80%, 60%)" 
                strokeDasharray="5 5"
                label={{ 
                  value: `$${currentPrice.toLocaleString()}`, 
                  position: 'right', 
                  fill: 'hsl(330, 80%, 60%)',
                  fontSize: 10
                }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(270, 70%, 60%)" 
                strokeWidth={2}
                fill="url(#priceGradientEnhanced)"
              />
              <Line 
                type="monotone" 
                dataKey="ma20" 
                stroke="hsl(330, 80%, 60%)" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="MA 20"
              />
              <Line 
                type="monotone" 
                dataKey="ma50" 
                stroke="hsl(45, 90%, 50%)" 
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="MA 50"
              />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke="hsl(270, 70%, 50%)"
                fill="hsl(240, 10%, 12%)"
              />
            </AreaChart>
          ) : (
            <ComposedChart data={data}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(240, 10%, 20%)" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="price"
                domain={['dataMin - 30', 'dataMax + 30']}
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 10 }}
                orientation="right"
                tickFormatter={(val) => `$${val}`}
                width={80}
              />
              <YAxis 
                yAxisId="volume"
                orientation="left"
                axisLine={false} 
                tickLine={false}
                tick={false}
              />
              <Tooltip content={<EnhancedTooltip coinSymbol={coin.symbol} />} />
              <Bar 
                yAxisId="volume"
                dataKey="volume" 
                fill="hsl(270, 70%, 50%)" 
                opacity={0.2}
                radius={[2, 2, 0, 0]}
              />
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="price" 
                stroke="hsl(270, 70%, 60%)" 
                strokeWidth={2}
                dot={false}
              />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke="hsl(270, 70%, 50%)"
                fill="hsl(240, 10%, 12%)"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(270,70%,60%)]" />
          <span className="text-muted-foreground">Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(330,80%,60%)] opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(330,80%,60%) 2px, hsl(330,80%,60%) 4px)' }} />
          <span className="text-muted-foreground">MA 20</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(45,90%,50%)] opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(45,90%,50%) 2px, hsl(45,90%,50%) 4px)' }} />
          <span className="text-muted-foreground">MA 50</span>
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="p-3 bg-muted/20 rounded-xl border border-pink/10">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className={`font-mono font-semibold text-sm ${positive ? "text-success" : ""}`}>{value}</div>
  </div>
);

const EnhancedTooltip = ({ active, payload, coinSymbol }: any) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="glass-card rounded-lg p-4 text-xs border border-pink/20">
      <div className="font-mono text-muted-foreground mb-3 text-sm">{coinSymbol}/USDC • {data.fullTime}</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-mono font-semibold">${data.open?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono font-semibold text-success">${data.high?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono font-semibold text-destructive">${data.low?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Close:</span>
          <span className="font-mono font-semibold">${data.price?.toLocaleString()}</span>
        </div>
        <div className="col-span-2 flex justify-between gap-4 pt-2 border-t border-border/50">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono">${(data.volume / 1000).toFixed(0)}K</span>
        </div>
      </div>
    </div>
  );
};
