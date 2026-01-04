export type WalletType = "metamask" | "phantom" | "pontem";

export interface WalletInfo {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
}

export interface ConnectedWallet {
  type: WalletType;
  address: string;
  shortAddress: string;
}

export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    description: "Connect to your MetaMask wallet",
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "👻",
    description: "Connect to your Phantom wallet",
    installUrl: "https://phantom.app/download",
  },
  {
    id: "pontem",
    name: "Pontem Wallet",
    icon: "🔷",
    description: "Connect to your Pontem wallet",
    installUrl: "https://pontem.network/pontem-wallet",
  },
];
