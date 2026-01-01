import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletType, WalletInfo, ConnectedWallet } from "@/types/wallet";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (type: WalletType) => Promise<ConnectedWallet>;
  isConnecting: boolean;
  error: string | null;
  isWalletInstalled: (type: WalletType) => boolean;
  supportedWallets: WalletInfo[];
}

export const WalletConnectModal = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  error,
  isWalletInstalled,
  supportedWallets,
}: WalletConnectModalProps) => {
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(null);
  const [success, setSuccess] = useState<WalletType | null>(null);

  const handleConnect = async (wallet: WalletInfo) => {
    if (!isWalletInstalled(wallet.id)) {
      window.open(wallet.installUrl, "_blank");
      return;
    }

    setConnectingWallet(wallet.id);
    setSuccess(null);

    try {
      await onConnect(wallet.id);
      setSuccess(wallet.id);
      setTimeout(() => {
        onClose();
        setSuccess(null);
        setConnectingWallet(null);
      }, 1000);
    } catch {
      setConnectingWallet(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
          >
            <div className="glass-card rounded-2xl overflow-hidden border border-pink/20">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <h2 className="text-xl font-bold">Connect Wallet</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Wallet Options */}
              <div className="p-4 space-y-3">
                {supportedWallets.map((wallet) => {
                  const installed = isWalletInstalled(wallet.id);
                  const isLoading = connectingWallet === wallet.id && isConnecting;
                  const isSuccess = success === wallet.id;

                  return (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleConnect(wallet)}
                      disabled={isConnecting}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isSuccess
                          ? "border-success bg-success/10"
                          : "border-pink/20 hover:border-pink/40 hover:bg-muted/30"
                      } ${isConnecting && !isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{wallet.icon}</span>
                        <div className="text-left">
                          <div className="font-semibold flex items-center gap-2">
                            {wallet.name}
                            {!installed && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Not installed
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {wallet.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isLoading && (
                          <Loader2 className="h-5 w-5 text-pink animate-spin" />
                        )}
                        {isSuccess && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="h-5 w-5 text-success" />
                          </motion.div>
                        )}
                        {!installed && !isLoading && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm text-destructive">{error}</span>
                </motion.div>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  By connecting, you agree to the Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
