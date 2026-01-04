import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/TokenIcon";
import { useSwapContract } from "@/hooks/useSwapContract";
import { usePontem } from "@/hooks/usePontem";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  usdValue: string;
}

// Base token definitions (balances will be fetched)
const TOKEN_DEFS = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠" },
  { symbol: "USDC", name: "USD Coin", icon: "💵" },
  { symbol: "SOL", name: "Solana", icon: "◎" },
  { symbol: "BTC", name: "Bitcoin", icon: "₿" },
  { symbol: "APT", name: "Aptos", icon: "🔷" },
  { symbol: "3LD", name: "3LD", icon: "✦" },
];

const DECIMALS = 8;

const formatBalance = (raw: number): string => {
  const value = raw / Math.pow(10, DECIMALS);
  if (value === 0) return "0";
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
};

const formatUsd = (raw: number, price: number): string => {
  const value = (raw / Math.pow(10, DECIMALS)) * price;
  if (value === 0) return "$0.00";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface TokenSelectorProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  label: string;
}

export const TokenSelector = ({ selectedToken, onSelect, label }: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  const { getTokenBalance, account } = useSwapContract();
  const { connected } = usePontem();
  const { getPrice } = useCryptoPrices();

  // Fetch balances when account changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!account) {
        setBalances({});
        return;
      }

      setLoadingBalances(true);
      console.log('[TokenSelector] Fetching balances for account:', account);

      const newBalances: Record<string, number> = {};
      for (const token of TOKEN_DEFS) {
        try {
          const balance = await getTokenBalance(account, token.symbol);
          newBalances[token.symbol] = balance;
          console.log(`[TokenSelector] ${token.symbol} balance:`, balance);
        } catch (e) {
          console.error(`[TokenSelector] Failed to fetch ${token.symbol} balance:`, e);
          newBalances[token.symbol] = 0;
        }
      }

      setBalances(newBalances);
      setLoadingBalances(false);
    };

    fetchBalances();
  }, [account, getTokenBalance]);

  // Build tokens with real balances
  const tokens: Token[] = useMemo(() => {
    return TOKEN_DEFS.map(def => {
      const rawBalance = balances[def.symbol] || 0;
      const priceData = getPrice(def.symbol);
      const price = priceData?.price || 0;

      return {
        ...def,
        balance: formatBalance(rawBalance),
        usdValue: formatUsd(rawBalance, price),
      };
    });
  }, [balances, getPrice]);

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button
        variant="glass"
        onClick={() => setIsOpen(true)}
        className="gap-2 px-3 py-2 h-auto"
      >
        <TokenIcon symbol={selectedToken.symbol} size={24} />
        <span className="font-mono font-semibold">{selectedToken.symbol}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <div className="glass-card rounded-2xl p-4 mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Select {label}</h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or symbol..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Token List */}
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => {
                        onSelect(token);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        token.symbol === selectedToken.symbol
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={token.symbol} size={32} />
                        <div className="text-left">
                          <div className="font-mono font-semibold">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {loadingBalances ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <div className="font-mono text-sm">{token.balance}</div>
                            <div className="text-xs text-muted-foreground">{token.usdValue}</div>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Default tokens for initial state (before balances are loaded)
const TOKENS: Token[] = TOKEN_DEFS.map(def => ({
  ...def,
  balance: "0",
  usdValue: "$0.00",
}));

export { TOKENS, TOKEN_DEFS, type Token };
