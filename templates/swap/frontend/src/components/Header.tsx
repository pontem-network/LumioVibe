import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Wallet, Settings, Bell, Zap, LogOut, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkSelector } from "./NetworkSelector";
import { GlobalCoinSearch } from "./GlobalCoinSearch";
import { WalletConnectModal } from "./WalletConnectModal";
import { usePontem } from "@/hooks/usePontem";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const {
    connected,
    account,
    connect,
    disconnect,
    isInstalled,
    isTestMode,
    error,
  } = usePontem();

  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '';

  const handleCopyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    if (isTestMode) {
      await connect();
      setIsModalOpen(false);
      toast({
        title: "Test Mode",
        description: "Connected with test account",
      });
    } else {
      setIsModalOpen(true);
    }
  };

  const handleWalletConnect = async (walletType: string) => {
    if (walletType === 'pontem') {
      const success = await connect();
      if (success) {
        setIsModalOpen(false);
        toast({
          title: "Wallet connected",
          description: "Your Pontem wallet has been connected",
        });
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  return (
    <>
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-center py-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            TEST MODE - Transactions signed with test private key
          </span>
        </div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border-b border-pink/20 sticky top-0 z-50"
      >
        <div className="container flex items-center justify-between h-16 px-4 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink to-purple flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gradient font-mono">VibeSwap</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">DEX</span>
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
            {/* Test Mode Badge */}
            {isTestMode && connected && (
              <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                Test
              </span>
            )}

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
            {connected ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="gap-2 border-glow-pink group"
                >
                  <span className="text-lg">🔷</span>
                  <span className="font-mono text-xs">{shortAddress}</span>
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
                onClick={handleConnect}
                className="gap-2 border border-pink/30"
              >
                <Wallet className="h-4 w-4" />
                <span>{isTestMode ? "Connect (Test)" : "Connect"}</span>
                <Zap className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <WalletConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleWalletConnect}
        isConnecting={false}
        error={error}
        isWalletInstalled={() => isInstalled}
        supportedWallets={[
          {
            id: "pontem",
            name: "Pontem Wallet",
            icon: "🔷",
            description: "Connect to Lumio Network",
            installUrl: "https://pontem.network/pontem-wallet",
          },
        ]}
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
