import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { SwapCard } from "@/components/SwapCard";
import { EnhancedPriceChart } from "@/components/EnhancedPriceChart";
import { MarketSignals } from "@/components/MarketSignals";
import { RecentTrades } from "@/components/RecentTrades";
import { WatchList } from "@/components/WatchList";
import { PoolsOverview } from "@/components/PoolsOverview";
import { CoinTicker } from "@/components/CoinTicker";
import { GlobalCoinSearch } from "@/components/GlobalCoinSearch";
import { ThreeLDTokenCard } from "@/components/ThreeLDTokenCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { SelectedCoin } from "@/types/coin";
import { useToast } from "@/hooks/use-toast";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

const Index = () => {
  const { scrollY } = useScroll();
  const { toast } = useToast();
  const swapCardRef = useRef<HTMLDivElement>(null);
  const { getPrice, getFormattedPrice } = useCryptoPrices();

  // Parallax: background moves at 30% of scroll speed for subtle depth
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 300]);
  const overlayOpacity = useTransform(scrollY, [0, 500], [0.8, 0.95]);

  // Selected coin state
  const [selectedCoin, setSelectedCoin] = useState<SelectedCoin>({
    symbol: "ETH",
    name: "Ethereum",
    icon: "⟠",
    price: "$3,420",
    change: 1.87
  });

  // Update selected coin price when prices change
  useEffect(() => {
    const priceData = getPrice(selectedCoin.symbol);
    if (priceData) {
      setSelectedCoin(prev => ({
        ...prev,
        price: getFormattedPrice(prev.symbol),
        change: priceData.change24h,
      }));
    }
  }, [getPrice, getFormattedPrice, selectedCoin.symbol]);

  const handleCoinSelect = (coin: SelectedCoin) => {
    setSelectedCoin(coin);
    toast({
      title: `Viewing ${coin.symbol}/USDC`,
      description: `${coin.name} chart loaded`,
    });
  };

  const handleBuy3LD = () => {
    // Scroll to swap card and pre-select 3LD
    swapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast({
      title: "Buy 3LD",
      description: "Use the swap card to exchange tokens for 3LD",
    });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Parallax Background Image */}
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/images/background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
          opacity: 0.45,
          y: backgroundY,
          scale: 1.1, // Slightly larger to prevent gaps during parallax
        }}
      />
      {/* Gradient overlay with dynamic opacity */}
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-background via-background/80 to-transparent"
        style={{ opacity: overlayOpacity }}
      />

      <Header />

      {/* Global Coin Search */}
      <GlobalCoinSearch onSelectCoin={handleCoinSelect} />

      {/* Coin Ticker Banner */}
      <CoinTicker onCoinSelect={handleCoinSelect} selectedSymbol={selectedCoin.symbol} />

      <main className="container py-6 relative z-10">
        {/* Hero Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <StatCard label="Total Value Locked" value="$127.4M" change="+12.5%" positive />
          <StatCard label="24h Volume" value="$45.2M" change="+8.3%" positive />
          <StatCard label="Active Traders" value="12,847" change="+324" positive />
          <StatCard label="Avg. Swap Time" value="<100ms" badge="3LD" />
        </motion.div>

        {/* Main Trading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Swap + Watchlist + 3LD Info */}
          <div className="lg:col-span-3 space-y-6">
            <div ref={swapCardRef}>
              <SwapCard />
            </div>
            <ThreeLDTokenCard onBuyClick={handleBuy3LD} />
            <WatchList onCoinSelect={handleCoinSelect} selectedSymbol={selectedCoin.symbol} />
          </div>

          {/* Center Panel - Chart + Trades */}
          <div className="lg:col-span-6 space-y-6">
            <EnhancedPriceChart selectedCoin={selectedCoin} />
            <PoolsOverview />
            <RecentTrades />
          </div>

          {/* Right Panel - Market Signals */}
          <div className="lg:col-span-3">
            <MarketSignals selectedSymbol={selectedCoin.symbol} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-pink/20 mt-12 py-8 relative z-10">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gradient font-bold font-mono">VibeSwap D3X</span>
              <span className="text-xs text-muted-foreground">Built on 3LD</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-pink transition-colors">Docs</a>
              <a href="#" className="hover:text-pink transition-colors">Security</a>
              <a href="#" className="hover:text-pink transition-colors">Analytics</a>
              <a href="#" className="hover:text-pink transition-colors">Discord</a>
              <a href="#" className="hover:text-pink transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  change,
  positive,
  badge
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  badge?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-card rounded-xl p-4 border-glow-pink"
  >
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold font-mono">{value}</span>
      {change && (
        <span className={`text-xs font-mono ${positive ? "text-success" : "text-destructive"}`}>
          {change}
        </span>
      )}
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {badge}
        </span>
      )}
    </div>
  </motion.div>
);

export default Index;
