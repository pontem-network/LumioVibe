export interface PontemProvider {
  version: string;
  connect(): Promise<{ address: string; publicKey: string } | string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  account(): Promise<string>;
  network(): Promise<PontemNetwork>;
  signAndSubmit(payload: PontemPayload, options?: PontemTxOptions): Promise<PontemTxResult>;
  onChangeAccount(callback: (address: string | undefined) => void): () => void;
  onChangeNetwork(callback: (network: PontemNetwork) => void): () => void;
  switchNetwork(chainId: number): Promise<boolean>;
}

export interface PontemNetwork {
  name: string;
  api: string;
  chainId: number;
}

export interface PontemPayload {
  function: string;
  arguments: string[];
  type_arguments?: string[];
}

export interface PontemTxOptions {
  max_gas_amount?: string;
  gas_unit_price?: string;
}

export interface PontemTxResult {
  success: boolean;
  result?: { hash: string; sender: string };
}

export const LUMIO_CHAIN_ID = 2;
export const LUMIO_RPC = 'https://api.testnet.lumio.io/v1';

export const IS_TEST_MODE = import.meta.env.VITE_WALLET_MODE === 'test';
export const TEST_PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY || '';
export const TEST_ADDRESS = import.meta.env.VITE_TEST_ADDRESS || import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const DEX_ADDRESS = import.meta.env.VITE_DEX_ADDRESS || CONTRACT_ADDRESS;

declare global {
  interface Window { pontem?: PontemProvider; }
  interface WindowEventMap { pontemWalletInjected: CustomEvent; }
}

export {};
