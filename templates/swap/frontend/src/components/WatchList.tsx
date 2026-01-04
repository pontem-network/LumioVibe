import { motion } from "framer-motion";
import { Star, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectedCoin } from "@/types/coin";
import { TokenIcon } from "@/components/TokenIcon";
import { useCryptoPrices, SYMBOL_ICONS } from "@/hooks/useCryptoPrices";

const WATCHLIST_SYMBOLS = ["ETH", "SOL", "APT", "3LD", "ARB"];

interface WatchListProps {
  onCoinSelect?: (coin: SelectedCoin) => void;
  selectedSymbol?: string;
}

export const WatchList = ({ onCoinSelect, selectedSymbol }: WatchListProps) => {
  const { prices, getFormattedPrice, getFormattedVolume } = useCryptoPrices();

  const watchlist = WATCHLIST_SYMBOLS.map(symbol => {
    const priceData = prices.get(symbol);
    return {
      symbol,
      name: priceData?.name || symbol,
      icon: SYMBOL_ICONS[symbol] || '●',
      price: getFormattedPrice(symbol),
      change: priceData?.change24h || 0,
      volume: getFormattedVolume(symbol),
    };
  });

  const handleItemClick = (item: typeof watchlist[0]) => {
    if (onCoinSelect) {
      onCoinSelect({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change: item.change,
        icon: item.icon,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-warning fill-warning" />
          Watchlist
        </h3>
        <Button variant="ghost" size="icon-sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {watchlist.map((item, idx) => (
          <motion.button
            key={item.symbol}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + idx * 0.05 }}
            onClick={() => handleItemClick(item)}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer ${
              selectedSymbol === item.symbol 
                ? "bg-pink/20 ring-1 ring-pink/40" 
                : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <TokenIcon symbol={item.symbol} size={28} />
              <div className="text-left">
                <div className="font-mono font-semibold text-sm">{item.symbol}</div>
                <div className="text-[10px] text-muted-foreground">{item.name}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-mono text-sm">{item.price}</div>
              <div className={`flex items-center justify-end gap-1 text-xs ${
                item.change >= 0 ? "text-success" : "text-destructive"
              }`}>
                {item.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
