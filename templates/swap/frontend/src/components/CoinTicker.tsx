import { motion } from "framer-motion";
import { SelectedCoin } from "@/types/coin";
import { TokenIcon } from "@/components/TokenIcon";
import { useCryptoPrices, SYMBOL_ICONS } from "@/hooks/useCryptoPrices";

const TICKER_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOGE", "DOT", "LINK",
  "MATIC", "SHIB", "LTC", "UNI", "ATOM", "APT", "ARB", "OP", "SUI", "TIA",
  "INJ", "NEAR", "FTM", "PEPE", "WIF", "RENDER", "FET", "IMX", "SEI", "3LD"
];

interface CoinTickerProps {
  onCoinSelect?: (coin: SelectedCoin) => void;
  selectedSymbol?: string;
}

export const CoinTicker = ({ onCoinSelect, selectedSymbol }: CoinTickerProps) => {
  const { prices, getFormattedPrice } = useCryptoPrices();

  const coins = TICKER_SYMBOLS.map(symbol => {
    const priceData = prices.get(symbol);
    return {
      symbol,
      name: priceData?.name || symbol,
      price: getFormattedPrice(symbol),
      change: priceData?.change24h ?? 0,
      icon: SYMBOL_ICONS[symbol] || '●',
    };
  });

  // Duplicate for seamless loop
  const duplicatedCoins = [...coins, ...coins];

  const handleCoinClick = (coin: typeof coins[0]) => {
    if (onCoinSelect) {
      onCoinSelect({
        symbol: coin.symbol,
        name: coin.name,
        price: coin.price,
        change: coin.change,
        icon: coin.icon,
      });
    }
  };

  return (
    <div className="w-full overflow-hidden glass-card border-y border-pink/20 py-3 mb-6">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{
          x: [0, -50 * coins.length],
        }}
        transition={{
          x: {
            duration: 60,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {duplicatedCoins.map((coin, index) => {
          const isSelected = selectedSymbol === coin.symbol;
          return (
            <button
              key={`${coin.symbol}-${index}`}
              onClick={() => handleCoinClick(coin)}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ease-out cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-pink/30 via-pink/20 to-transparent ring-2 ring-pink/60 shadow-[0_0_20px_rgba(255,0,128,0.3)] scale-105 relative z-10"
                  : "hover:bg-pink/10 hover:scale-105"
              }`}
            >
              <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
                isSelected
                  ? "ring-2 ring-pink/50 shadow-[0_0_12px_rgba(255,0,128,0.5)]"
                  : ""
              }`}>
                <TokenIcon symbol={coin.symbol} size={24} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-semibold text-sm transition-colors duration-300 ${
                  isSelected ? "text-pink" : ""
                }`}>{coin.symbol}</span>
                <span className="text-muted-foreground text-sm">{coin.price}</span>
                <span
                  className={`text-xs font-mono ${
                    (coin.change ?? 0) >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {(coin.change ?? 0) >= 0 ? "+" : ""}{(coin.change ?? 0).toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};
