import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, Settings, Info, Zap, Shield, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenSelector, TOKENS, Token } from "./TokenSelector";
import { Slider } from "@/components/ui/slider";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useSwapContract } from "@/hooks/useSwapContract";
import { usePontem } from "@/hooks/usePontem";
import { usePools } from "@/hooks/usePools";

export const SwapCard = () => {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("1.0");
  const [slippage, setSlippage] = useState([0.5]);
  const [showSettings, setShowSettings] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<number>(0);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [isToken0ToToken1, setIsToken0ToToken1] = useState(true);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const { getPrice } = useCryptoPrices();
  const { connected, account, isTestMode } = usePontem();
  const { swapExactInput, getAmountOut, getTokenBalance, loading, error } = useSwapContract();
  const { pools, dexInitialized, refreshPools } = usePools();

  // Find matching pool for token pair
  useEffect(() => {
    const pool = pools.find(p =>
      (p.token0.symbol === fromToken.symbol && p.token1.symbol === toToken.symbol) ||
      (p.token0.symbol === toToken.symbol && p.token1.symbol === fromToken.symbol)
    );

    if (pool) {
      setSelectedPoolId(Number(pool.id));
      setIsToken0ToToken1(pool.token0.symbol === fromToken.symbol);
    } else {
      setSelectedPoolId(null);
    }
  }, [fromToken, toToken, pools]);

  // Get estimated output from contract
  const updateEstimate = useCallback(async () => {
    if (selectedPoolId === null || !fromAmount || parseFloat(fromAmount) <= 0) {
      setEstimatedOutput(0);
      return;
    }

    try {
      const amountIn = Math.floor(parseFloat(fromAmount) * 1e8); // Convert to smallest unit
      const amountOut = await getAmountOut(selectedPoolId, amountIn, isToken0ToToken1);
      setEstimatedOutput(amountOut / 1e8); // Convert back
    } catch (e) {
      console.error("Failed to get estimate:", e);
      setEstimatedOutput(0);
    }
  }, [selectedPoolId, fromAmount, isToken0ToToken1, getAmountOut]);

  useEffect(() => {
    if (dexInitialized && selectedPoolId !== null) {
      updateEstimate();
    }
  }, [dexInitialized, selectedPoolId, fromAmount, updateEstimate]);

  // Fallback to price-based calculation if no pool exists
  const fromPrice = getPrice(fromToken.symbol);
  const toPrice = getPrice(toToken.symbol);

  const exchangeRate = fromPrice && toPrice && toPrice.price > 0
    ? fromPrice.price / toPrice.price
    : 1;

  const toAmount = dexInitialized && selectedPoolId !== null && estimatedOutput > 0
    ? estimatedOutput.toFixed(6)
    : (parseFloat(fromAmount || "0") * exchangeRate).toFixed(
        exchangeRate > 1000 ? 0 : exchangeRate > 1 ? 2 : 6
      );

  const priceImpact = estimatedOutput > 0
    ? Math.abs(1 - (estimatedOutput / (parseFloat(fromAmount || "1") * exchangeRate))) * 100
    : 0.12;
  const gasFee = "$0.01";

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleSwap = async () => {
    if (!connected || selectedPoolId === null) return;

    setTxStatus('pending');
    try {
      const amountIn = Math.floor(parseFloat(fromAmount) * 1e8);
      const minAmountOut = Math.floor(estimatedOutput * (1 - slippage[0] / 100) * 1e8);

      const result = await swapExactInput(selectedPoolId, amountIn, minAmountOut, isToken0ToToken1);

      if (result) {
        setTxStatus('success');
        setFromAmount("");
        refreshPools();
        setTimeout(() => setTxStatus('idle'), 3000);
      } else {
        setTxStatus('error');
        setTimeout(() => setTxStatus('idle'), 3000);
      }
    } catch (e) {
      console.error("Swap failed:", e);
      setTxStatus('error');
      setTimeout(() => setTxStatus('idle'), 3000);
    }
  };

  const formatRate = (rate: number): string => {
    if (rate >= 1000) return rate.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (rate >= 1) return rate.toFixed(2);
    return rate.toFixed(6);
  };

  const canSwap = connected && selectedPoolId !== null && parseFloat(fromAmount) > 0 && !loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">Swap</h2>
          <p className="text-xs text-muted-foreground">
            {dexInitialized ? "Trade tokens on-chain" : "Demo mode - connect wallet to trade"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTestMode && (
            <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-lg">
              Test Mode
            </span>
          )}
          <Button
            variant="icon"
            size="icon-sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mb-4 p-4 bg-muted/30 rounded-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm">Slippage Tolerance</span>
            <span className="font-mono text-sm text-primary">{slippage[0]}%</span>
          </div>
          <Slider
            value={slippage}
            onValueChange={setSlippage}
            max={5}
            min={0.1}
            step={0.1}
            className="mb-3"
          />
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0].map((val) => (
              <Button
                key={val}
                variant={slippage[0] === val ? "default" : "outline"}
                size="sm"
                onClick={() => setSlippage([val])}
                className="flex-1 text-xs"
              >
                {val}%
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* From Token */}
      <div className="p-4 bg-muted/30 rounded-xl mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">You Pay</span>
          <span className="text-xs text-muted-foreground">
            Balance: <span className="font-mono">{fromToken.balance}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-mono font-semibold outline-none placeholder:text-muted-foreground/50"
          />
          <TokenSelector
            selectedToken={fromToken}
            onSelect={setFromToken}
            label="token to pay"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground font-mono">
            ~ ${fromPrice ? (parseFloat(fromAmount || "0") * fromPrice.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
          </span>
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setFromAmount((parseFloat(fromToken.balance.replace(",", "")) * pct / 100).toFixed(4))}
                className="px-2 py-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-3 relative z-10">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSwapTokens}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg"
        >
          <ArrowDownUp className="h-4 w-4 text-primary-foreground" />
        </motion.button>
      </div>

      {/* To Token */}
      <div className="p-4 bg-muted/30 rounded-xl mt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">You Receive</span>
          <span className="text-xs text-muted-foreground">
            Balance: <span className="font-mono">{toToken.balance}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={toAmount}
            readOnly
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-mono font-semibold outline-none text-foreground/80"
          />
          <TokenSelector
            selectedToken={toToken}
            onSelect={setToToken}
            label="token to receive"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-2">
          ~ ${toPrice ? (parseFloat(toAmount) * toPrice.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
        </div>
      </div>

      {/* Pool Status */}
      {selectedPoolId === null && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-400 text-center">
            No liquidity pool exists for this pair. Create one in the Pools section.
          </p>
        </div>
      )}

      {/* Trade Info */}
      <div className="mt-4 p-3 bg-muted/20 rounded-xl space-y-2">
        <InfoRow label="Rate" value={`1 ${fromToken.symbol} = ${formatRate(exchangeRate)} ${toToken.symbol}`} />
        <InfoRow
          label="Price Impact"
          value={`${priceImpact.toFixed(2)}%`}
          valueClass={priceImpact < 1 ? "text-success" : priceImpact < 3 ? "text-warning" : "text-destructive"}
        />
        <InfoRow label="Network Fee" value={gasFee} />
        <InfoRow
          label="Route"
          value={selectedPoolId !== null ? `Pool #${selectedPoolId}` : "No route found"}
          icon={selectedPoolId !== null ? <Zap className="h-3 w-3 text-primary" /> : undefined}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      )}

      {/* Swap Button */}
      <Button
        variant="swap"
        size="xl"
        className="w-full mt-4"
        onClick={handleSwap}
        disabled={!canSwap || txStatus === 'pending'}
      >
        {txStatus === 'pending' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Swapping...
          </>
        ) : txStatus === 'success' ? (
          <>
            <Shield className="h-5 w-5 text-green-400" />
            Swap Successful!
          </>
        ) : txStatus === 'error' ? (
          <>
            <Shield className="h-5 w-5 text-red-400" />
            Swap Failed
          </>
        ) : !connected ? (
          <>
            <Shield className="h-5 w-5" />
            Connect Wallet
          </>
        ) : (
          <>
            <Shield className="h-5 w-5" />
            SWAP
            <TrendingUp className="h-4 w-4" />
          </>
        )}
      </Button>
    </motion.div>
  );
};

const InfoRow = ({
  label,
  value,
  valueClass = "",
  icon
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground flex items-center gap-1">
      <Info className="h-3 w-3" />
      {label}
    </span>
    <span className={`font-mono flex items-center gap-1 ${valueClass}`}>
      {icon}
      {value}
    </span>
  </div>
);
