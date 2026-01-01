import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/TokenIcon";

interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  usdValue: string;
}

const TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: "2.4521", usdValue: "$8,234.12" },
  { symbol: "USDC", name: "USD Coin", icon: "💵", balance: "5,420.00", usdValue: "$5,420.00" },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: "45.23", usdValue: "$4,892.15" },
  { symbol: "APT", name: "Aptos", icon: "🔷", balance: "312.5", usdValue: "$2,187.50" },
  { symbol: "3LD", name: "3LD", icon: "✦", balance: "10,000", usdValue: "$1,250.00" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "₿", balance: "0.0521", usdValue: "$5,210.00" },
];

interface TokenSelectorProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  label: string;
}

export const TokenSelector = ({ selectedToken, onSelect, label }: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTokens = TOKENS.filter(
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
                        <div className="font-mono text-sm">{token.balance}</div>
                        <div className="text-xs text-muted-foreground">{token.usdValue}</div>
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

export { TOKENS, type Token };
