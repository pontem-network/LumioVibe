import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Zap,
  Target,
  BarChart3
} from "lucide-react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface MarketSignalsProps {
  selectedSymbol?: string;
}

export const MarketSignals = ({ selectedSymbol = "ETH" }: MarketSignalsProps) => {
  const { getPrice, getFormattedPrice } = useCryptoPrices();
  const priceData = getPrice(selectedSymbol);
  const currentPrice = priceData?.price || 0;

  // Calculate dynamic levels based on current price
  const resistance1 = currentPrice * 1.03;
  const resistance2 = currentPrice * 1.07;
  const support1 = currentPrice * 0.96;
  const support2 = currentPrice * 0.91;

  const formatLevel = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const tradeScore = 78;
  const buyPressure = 65;
  const rsi = 58;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Trade Score */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            AI Trade Score
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
        </div>

        <div className="relative flex items-center justify-center mb-4">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              strokeWidth="8"
              stroke="hsl(var(--muted))"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              strokeWidth="8"
              stroke="url(#scoreGradient)"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(tradeScore / 100) * 352} 352`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(270, 70%, 50%)" />
                <stop offset="100%" stopColor="hsl(142, 70%, 45%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold font-mono">{tradeScore}</span>
            <span className="text-xs text-success font-medium">STRONG BUY</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Based on momentum, liquidity, and volatility analysis
        </div>
      </div>

      {/* Buy/Sell Pressure */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-secondary" />
          Market Pressure
        </h3>

        <div className="space-y-4">
          <PressureBar
            label="Buy Pressure"
            value={buyPressure}
            color="success"
            icon={<TrendingUp className="h-3 w-3" />}
          />
          <PressureBar
            label="Sell Pressure"
            value={100 - buyPressure}
            color="destructive"
            icon={<TrendingDown className="h-3 w-3" />}
          />
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Indicators
        </h3>

        <div className="space-y-3">
          <IndicatorRow
            label="RSI (14)"
            value={rsi}
            status={rsi < 30 ? "oversold" : rsi > 70 ? "overbought" : "neutral"}
          />
          <IndicatorRow
            label="MACD"
            value="Bullish Cross"
            status="bullish"
          />
          <IndicatorRow
            label="Volume"
            value="+42% avg"
            status="bullish"
          />
          <IndicatorRow
            label="Volatility"
            value="Medium"
            status="neutral"
          />
        </div>
      </div>

      {/* Whale Alert */}
      <div className="glass-card rounded-2xl p-5 border border-warning/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Flame className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Whale Alert</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Large buy order detected: 450 ETH ($1.53M) added to liquidity
            </p>
            <span className="text-[10px] text-muted-foreground">2 min ago</span>
          </div>
        </div>
      </div>

      {/* Support/Resistance */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-secondary" />
          Key Levels
        </h3>

        <div className="space-y-2">
          <LevelRow label="Resistance 2" value={formatLevel(resistance2)} type="resistance" />
          <LevelRow label="Resistance 1" value={formatLevel(resistance1)} type="resistance" />
          <div className="py-2 my-2 border-y border-border">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Current Price</span>
              <span className="font-mono font-bold text-primary">{getFormattedPrice(selectedSymbol)}</span>
            </div>
          </div>
          <LevelRow label="Support 1" value={formatLevel(support1)} type="support" />
          <LevelRow label="Support 2" value={formatLevel(support2)} type="support" />
        </div>
      </div>
    </motion.div>
  );
};

const PressureBar = ({
  label,
  value,
  color,
  icon
}: {
  label: string;
  value: number;
  color: "success" | "destructive";
  icon: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={`text-xs font-mono font-semibold text-${color}`}>{value}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full ${
          color === "success"
            ? "bg-gradient-to-r from-success/50 to-success"
            : "bg-gradient-to-r from-destructive/50 to-destructive"
        }`}
      />
    </div>
  </div>
);

const IndicatorRow = ({
  label,
  value,
  status
}: {
  label: string;
  value: string | number;
  status: "bullish" | "bearish" | "neutral" | "oversold" | "overbought";
}) => {
  const statusColors = {
    bullish: "text-success bg-success/10",
    bearish: "text-destructive bg-destructive/10",
    neutral: "text-muted-foreground bg-muted",
    oversold: "text-success bg-success/10",
    overbought: "text-destructive bg-destructive/10",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono px-2 py-0.5 rounded ${statusColors[status]}`}>
        {value}
      </span>
    </div>
  );
};

const LevelRow = ({
  label,
  value,
  type
}: {
  label: string;
  value: string;
  type: "support" | "resistance";
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-xs font-mono font-medium ${
      type === "resistance" ? "text-destructive" : "text-success"
    }`}>
      {value}
    </span>
  </div>
);
