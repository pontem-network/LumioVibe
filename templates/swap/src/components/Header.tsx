import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Wallet, Settings, Bell, Zap, LogOut, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkSelector } from "./NetworkSelector";
import { GlobalCoinSearch } from "./GlobalCoinSearch";
import { WalletConnectModal } from "./WalletConnectModal";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const {
    connectedWallet,
    isConnecting,
    error,
    connect,
    disconnect,
    isWalletInstalled,
    supportedWallets,
  } = useWallet();

  const handleCopyAddress = async () => {
    if (connectedWallet?.address) {
      await navigator.clipboard.writeText(connectedWallet.address);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const getWalletIcon = () => {
    switch (connectedWallet?.type) {
      case "metamask":
        return "🦊";
      case "phantom":
        return "👻";
      case "pontem":
        return "🔷";
      default:
        return null;
    }
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border-b border-pink/20 sticky top-0 z-50"
      >
        <div className="container flex items-center justify-between h-16 px-4 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={logo} alt="VibeSwap" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gradient font-mono">VibeSwap</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">D3X</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <GlobalCoinSearch />
          </div>

          {/* Navigation */}
          <Nav />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Network Selector */}
            <div className="hidden sm:block">
              <NetworkSelector />
            </div>

            {/* Notifications */}
            <Button variant="icon" size="icon-sm" className="relative border-glow-pink">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink rounded-full" />
            </Button>

            {/* Settings */}
            <Button variant="icon" size="icon-sm" className="border-glow-pink">
              <Settings className="h-4 w-4" />
            </Button>

            {/* Wallet */}
            {connectedWallet ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="gap-2 border-glow-pink group"
                >
                  <span className="text-lg">{getWalletIcon()}</span>
                  <span className="font-mono text-xs">{connectedWallet.shortAddress}</span>
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDisconnect}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="swap" 
                size="sm" 
                onClick={() => setIsModalOpen(true)}
                className="gap-2 border border-pink/30"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect</span>
                <Zap className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <WalletConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={connect}
        isConnecting={isConnecting}
        error={error}
        isWalletInstalled={isWalletInstalled}
        supportedWallets={supportedWallets}
      />
    </>
  );
};

const navItems = [
  { label: "Trade", path: "/" },
  { label: "Pools", path: "/pools" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Analytics", path: "/analytics" },
];

const Nav = () => {
  const location = useLocation();
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary/10 text-primary border-glow-pink"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
