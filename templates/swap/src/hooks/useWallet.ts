import { useState, useCallback, useEffect } from "react";
import { WalletType, ConnectedWallet, SUPPORTED_WALLETS } from "@/types/wallet";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      off: (event: string, callback: (...args: unknown[]) => void) => void;
    };
    pontem?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string } | null>;
    };
    aptos?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string } | null>;
    };
  }
}

const shortenAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const useWallet = () => {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is installed
  const isWalletInstalled = useCallback((type: WalletType): boolean => {
    switch (type) {
      case "metamask":
        return typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
      case "phantom":
        return typeof window !== "undefined" && !!window.solana?.isPhantom;
      case "pontem":
        return typeof window !== "undefined" && !!(window.pontem || window.aptos);
      default:
        return false;
    }
  }, []);

  // Connect to MetaMask
  const connectMetaMask = async (): Promise<string> => {
    if (!window.ethereum?.isMetaMask) {
      throw new Error("MetaMask is not installed");
    }
    
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }) as string[];
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }
    
    return accounts[0];
  };

  // Connect to Phantom
  const connectPhantom = async (): Promise<string> => {
    if (!window.solana?.isPhantom) {
      throw new Error("Phantom is not installed");
    }
    
    const response = await window.solana.connect();
    return response.publicKey.toString();
  };

  // Connect to Pontem
  const connectPontem = async (): Promise<string> => {
    const pontemWallet = window.pontem || window.aptos;
    
    if (!pontemWallet) {
      throw new Error("Pontem Wallet is not installed");
    }
    
    const response = await pontemWallet.connect();
    return response.address;
  };

  // Main connect function
  const connect = useCallback(async (type: WalletType) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      let address: string;
      
      switch (type) {
        case "metamask":
          address = await connectMetaMask();
          break;
        case "phantom":
          address = await connectPhantom();
          break;
        case "pontem":
          address = await connectPontem();
          break;
        default:
          throw new Error("Unsupported wallet");
      }
      
      const wallet: ConnectedWallet = {
        type,
        address,
        shortAddress: shortenAddress(address),
      };
      
      setConnectedWallet(wallet);
      localStorage.setItem("connectedWallet", JSON.stringify(wallet));
      
      return wallet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (connectedWallet?.type === "phantom" && window.solana) {
      await window.solana.disconnect();
    }
    
    if (connectedWallet?.type === "pontem") {
      const pontemWallet = window.pontem || window.aptos;
      if (pontemWallet) {
        await pontemWallet.disconnect();
      }
    }
    
    setConnectedWallet(null);
    localStorage.removeItem("connectedWallet");
  }, [connectedWallet]);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("connectedWallet");
    if (stored) {
      try {
        const wallet = JSON.parse(stored) as ConnectedWallet;
        if (isWalletInstalled(wallet.type)) {
          setConnectedWallet(wallet);
        } else {
          localStorage.removeItem("connectedWallet");
        }
      } catch {
        localStorage.removeItem("connectedWallet");
      }
    }
  }, [isWalletInstalled]);

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: unknown[]) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        disconnect();
      } else if (connectedWallet?.type === "metamask") {
        const newAddress = accountList[0];
        setConnectedWallet({
          type: "metamask",
          address: newAddress,
          shortAddress: shortenAddress(newAddress),
        });
      }
    };

    if (window.ethereum && connectedWallet?.type === "metamask") {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [connectedWallet, disconnect]);

  return {
    connectedWallet,
    isConnecting,
    error,
    connect,
    disconnect,
    isWalletInstalled,
    supportedWallets: SUPPORTED_WALLETS,
  };
};
