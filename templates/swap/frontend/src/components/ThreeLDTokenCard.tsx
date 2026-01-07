import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Coins, Users, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenIcon } from "@/components/TokenIcon";
import { useToast } from "@/hooks/use-toast";
import { useCryptoPrices, formatPrice, formatVolume } from "@/hooks/useCryptoPrices";

interface ThreeLDTokenCardProps {
  onBuyClick?: () => void;
}

export const ThreeLDTokenCard = ({ onBuyClick }: ThreeLDTokenCardProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"info" | "stake">("info");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const { getPrice } = useCryptoPrices();

  const threeLdPrice = getPrice("3LD");

  const tokenData = {
    price: threeLdPrice ? formatPrice(threeLdPrice.price) : "$0.0847",
    change24h: threeLdPrice?.change24h || 12.5,
    marketCap: threeLdPrice ? formatVolume(threeLdPrice.marketCap) : "$84.7M",
    circulatingSupply: "1B",
    totalSupply: "10B",
    holders: "24,847",
    stakingAPY: 18.5,
    totalStaked: "$12.4M",
    yourStaked: "0",
  };

  const handleStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive",
      });
      return;
    }

    setIsStaking(true);
    setTimeout(() => {
      setIsStaking(false);
      toast({
        title: "Staking Successful!",
        description: `You staked ${stakeAmount} 3LD tokens`,
      });
      setStakeAmount("");
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 border-glow-pink"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <TokenIcon symbol="3LD" size={40} />
            <motion.div
              className="absolute -inset-1 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h3 className="font-bold text-lg">3LD Token</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold">{tokenData.price}</span>
              <span className={`text-xs font-mono ${tokenData.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                {tokenData.change24h >= 0 ? "+" : ""}{tokenData.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-muted/30">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "info"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Token Info
        </button>
        <button
          onClick={() => setActiveTab("stake")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "stake"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Stake
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "info" ? (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                label="Market Cap"
                value={tokenData.marketCap}
              />
              <StatItem
                icon={<Coins className="h-4 w-4 text-primary" />}
                label="Circulating"
                value={tokenData.circulatingSupply}
              />
              <StatItem
                icon={<Users className="h-4 w-4 text-primary" />}
                label="Holders"
                value={tokenData.holders}
              />
              <StatItem
                icon={<Lock className="h-4 w-4 text-primary" />}
                label="Total Staked"
                value={tokenData.totalStaked}
              />
            </div>

            {/* Supply Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Circulating / Total Supply</span>
                <span>10%</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-pink"
                  initial={{ width: 0 }}
                  animate={{ width: "10%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>

            {/* Buy Button */}
            <Button
              onClick={onBuyClick}
              className="w-full mt-4 bg-gradient-to-r from-primary to-pink hover:opacity-90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Buy 3LD
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="stake"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {/* APY Display */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-pink/10 border border-primary/20">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Current APY
              </div>
              <div className="text-3xl font-bold font-mono text-gradient">
                {tokenData.stakingAPY}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rewards paid daily
              </div>
            </div>

            {/* Your Staked */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Your Staked</span>
              <span className="font-mono font-medium">{tokenData.yourStaked} 3LD</span>
            </div>

            {/* Stake Input */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Amount to Stake
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="pr-16 font-mono"
                />
                <button
                  onClick={() => setStakeAmount("1000")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Estimated Rewards */}
            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 rounded-lg bg-success/10 border border-success/20"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Daily Rewards</span>
                  <span className="font-mono text-success">
                    +{((parseFloat(stakeAmount) * tokenData.stakingAPY) / 100 / 365).toFixed(4)} 3LD
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Est. Yearly Rewards</span>
                  <span className="font-mono text-success">
                    +{((parseFloat(stakeAmount) * tokenData.stakingAPY) / 100).toFixed(2)} 3LD
                  </span>
                </div>
              </motion.div>
            )}

            {/* Stake Button */}
            <Button
              onClick={handleStake}
              disabled={isStaking || !stakeAmount}
              className="w-full bg-gradient-to-r from-primary to-pink hover:opacity-90"
            >
              {isStaking ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Stake 3LD
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StatItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="font-mono font-bold">{value}</div>
  </div>
);
