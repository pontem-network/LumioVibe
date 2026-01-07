import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Network {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const NETWORKS: Network[] = [
  { id: "3ld", name: "3LD", icon: "✦", color: "hsl(330, 80%, 55%)" },
  { id: "eth", name: "ETH", icon: "⟠", color: "hsl(220, 60%, 50%)" },
  { id: "sol", name: "SOL", icon: "◎", color: "hsl(280, 80%, 60%)" },
  { id: "avax", name: "AVAX", icon: "🔺", color: "hsl(0, 70%, 50%)" },
  { id: "bsc", name: "BSC", icon: "💛", color: "hsl(45, 90%, 50%)" },
  { id: "apt", name: "APT", icon: "🔷", color: "hsl(200, 70%, 50%)" },
  { id: "base", name: "BASE", icon: "🔵", color: "hsl(220, 80%, 55%)" },
];

export const NetworkSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]);

  return (
    <div className="relative">
      <Button
        variant="glass"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-lg">{selectedNetwork.icon}</span>
        <span className="font-mono text-xs">{selectedNetwork.name}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-48 glass-card rounded-xl p-2 z-50"
            >
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => {
                    setSelectedNetwork(network);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                    selectedNetwork.id === network.id
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{network.icon}</span>
                    <span className="font-mono text-sm">{network.name}</span>
                  </div>
                  {selectedNetwork.id === network.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
