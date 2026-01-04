import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { SelectedCoin } from "@/types/coin";
import { TokenIcon } from "@/components/TokenIcon";
import { useCryptoPrices, SYMBOL_ICONS } from "@/hooks/useCryptoPrices";

const SEARCH_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOGE", "DOT", "LINK",
  "MATIC", "SHIB", "LTC", "UNI", "ATOM", "APT", "USDC", "USDT", "3LD", "WBTC"
];

interface GlobalCoinSearchProps {
  onSelectCoin?: (coin: SelectedCoin) => void;
}

export const GlobalCoinSearch = ({ onSelectCoin }: GlobalCoinSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { prices, getFormattedPrice, getFormattedVolume } = useCryptoPrices();

  const allCoins = SEARCH_SYMBOLS.map(symbol => {
    const priceData = prices.get(symbol);
    return {
      symbol,
      name: priceData?.name || symbol,
      price: getFormattedPrice(symbol),
      change: priceData?.change24h || 0,
      icon: SYMBOL_ICONS[symbol] || '●',
      volume: getFormattedVolume(symbol),
    };
  });

  const filteredCoins = allCoins.filter(
    (coin) =>
      coin.symbol.toLowerCase().includes(search.toLowerCase()) ||
      coin.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Search Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-muted/30 border border-pink/20 rounded-xl hover:bg-muted/50 hover:border-pink/40 transition-all group w-full max-w-md"
      >
        <Search className="h-4 w-4 text-muted-foreground group-hover:text-pink" />
        <span className="text-sm text-muted-foreground">Search coins...</span>
        <kbd className="hidden sm:flex ml-auto items-center gap-1 px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl z-50 px-4"
            >
              <div className="glass-card rounded-2xl overflow-hidden border border-pink/20">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
                  <Search className="h-5 w-5 text-pink" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a coin..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto p-2">
                  {filteredCoins.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No coins found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredCoins.map((coin) => (
                        <button
                          key={coin.symbol}
                          onClick={() => {
                            onSelectCoin?.(coin);
                            setIsOpen(false);
                            setSearch("");
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <TokenIcon symbol={coin.symbol} size={32} />
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{coin.symbol}</span>
                                <span className={`flex items-center gap-1 text-xs ${
                                  coin.change >= 0 ? "text-success" : "text-destructive"
                                }`}>
                                  {coin.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {coin.change >= 0 ? "+" : ""}{coin.change.toFixed(2)}%
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">{coin.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">{coin.price}</div>
                            <div className="text-xs text-muted-foreground">Vol: {coin.volume}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
                      Select
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">ESC</kbd>
                    Close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
