/* eslint max-classes-per-file: "off" */

import {
  PontemWindow,
  SignMessagePayload,
  SignMessageResponse,
} from "@pontem/aptos-wallet-adapter";
import { createContext, useContext, useState, useEffect } from "react";

declare const window: PontemWindow;

const LUMIO_RPC =
  import.meta.env.VITE_LUMIO_RPC_URL || "https://api.testnet.lumio.io/";
const LUMIO_RPC_V1 = LUMIO_RPC.endsWith("/")
  ? `${LUMIO_RPC}v1`
  : `${LUMIO_RPC}/v1`;
const CHAIN_ID = parseInt(import.meta.env.VITE_LUMIO_CHAIN_ID || "2", 10);
const DECIMALS = 8;
const NUMBER_OF_DECIMALS = 4;
const COIN_TYPE = "0x1::lumio_coin::LumioCoin";

type SignMessageWithoutSignature = Omit<SignMessageResponse, "signature">;

async function lumioBalance(account: string): Promise<number> {
  const balanceResponse: number[] = await fetch(`${LUMIO_RPC_V1}/view`, {
    method: "POST",
    body: JSON.stringify({
      function: "0x1::coin::balance",
      type_arguments: [COIN_TYPE],
      arguments: [account],
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }).then((r) => r.json());

  if (balanceResponse.constructor === Array) {
    const balance: number =
      Math.round(balanceResponse[0] / 10 ** (DECIMALS - NUMBER_OF_DECIMALS)) /
      10 ** NUMBER_OF_DECIMALS;

    return balance;
  }

  return 0.0;
}

class Message implements SignMessagePayload {
  address: boolean = true; // Should we include the address of the account in the message

  application: boolean = true; // Should we include the domain of the dapp

  chainId: boolean = true; // Should we include the current chain id the wallet is connected to

  message: string; // The message to be signed and displayed to the user

  nonce: string; // A nonce the dapp should generate

  constructor(message: string, nonce: string) {
    this.message = message;
    this.nonce = nonce;
  }
}

class AuthToken {
  static STORAGE_NAME: string = "auth_token";

  token: string | null = null;

  account: string | null = null;

  verified_token: boolean | false = false;

  nonce: string | null = null;

  constructor(load: boolean = true) {
    if (!load) return;

    let tokenValue: AuthToken | null = null;

    const tokenValueString = localStorage.getItem(AuthToken.STORAGE_NAME);
    if (tokenValueString !== null) {
      try {
        tokenValue = JSON.parse(tokenValueString);
      } catch {
        tokenValue = null;
        AuthToken.delete();
      }
    } else {
      return;
    }

    if (tokenValue !== null) Object.assign(this, tokenValue);
  }

  async connect(): Promise<boolean> {
    return (await this.check()) || (await this.new());
  }

  async disconnect(): Promise<boolean> {
    this.set_defaults();
    return true;
  }

  async check(): Promise<boolean> {
    if (this.token === null) {
      this.set_defaults();
      return false;
    }
    const token: AuthToken = await fetch("/api/token/status", {
      method: "POST",
      body: JSON.stringify(this),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }).then((r) => r.json());

    Object.assign(this, token);
    return this.verified_token;
  }

  async new(): Promise<boolean> {
    this.set_defaults();

    if (!window.pontem) return false;
    this.account = await window.pontem?.account();

    const response = await fetch("/api/token/new", {
      method: "POST",
      body: JSON.stringify(this),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create token");
    }

    const newToken: AuthToken = await response.json();

    Object.assign(this, newToken);
    this.save();

    const newTokenString = JSON.stringify(newToken);

    // Use server-generated nonce for signing
    const serverNonce = newToken.nonce || "";

    const { success, result: signMessage } = await window.pontem.signMessage(
      new Message(newTokenString, serverNonce),
      {
        useNewFormat: true,
      },
    );

    if (!success) return false;

    // Get public key for signature verification
    const publicKey = await window.pontem.publicKey();

    const signNormalize = (() => {
      const message: SignMessageWithoutSignature =
        signMessage as SignMessageWithoutSignature;
      return {
        ...message,
        signature: Array.from(signMessage.signature),
        publicKey,
      };
    })();

    const verifyResponse = await fetch("/api/token/verify", {
      method: "POST",
      body: JSON.stringify(signNormalize),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.detail || "Failed to verify signature");
    }

    const verifyToken: AuthToken = await verifyResponse.json();

    Object.assign(this, verifyToken);
    this.save();

    if (!verifyToken.verified_token) {
      throw new Error("Signature verification failed");
    }

    return verifyToken.verified_token;
  }

  protected save(): void {
    localStorage.setItem(AuthToken.STORAGE_NAME, JSON.stringify(this));
  }

  protected static delete(): void {
    localStorage.removeItem(AuthToken.STORAGE_NAME);
  }

  protected set_defaults(): AuthToken {
    Object.assign(this, new AuthToken(false));
    this.save();
    return this;
  }
}

export class AuthState {
  connected: boolean = false;

  initialized: boolean = false;

  token: AuthToken = new AuthToken(true);

  async init(): Promise<AuthState> {
    const { pontem } = window;

    if (!pontem || !(await pontem.isConnected())) {
      this.initialized = true;
      return this;
    }
    if (!(await this.token.check())) {
      this.initialized = true;
      return this;
    }

    this.connected = true;
    this.initialized = true;

    return this;
  }

  async connect(): Promise<AuthState> {
    this.connected = false;
    const { pontem } = window;
    if (!pontem) return this;

    if (!(await pontem.isConnected())) await pontem.connect();

    this.connected = await this.token.connect();

    return this;
  }

  async disconnect() {
    const { pontem } = window;
    if (pontem) await pontem.disconnect();

    const success: boolean = await fetch("/api/token", {
      method: "DELETE",
    }).then((response) => response.json());
    if (success) Object.assign(this, new AuthState());
  }

  async balance(): Promise<number> {
    const { pontem } = window;
    if (!this.connected || !pontem) return 0;
    const { account } = this.token;

    return account ? lumioBalance(account.toString()) : 0.0;
  }

  async topUpBalance(): Promise<void> {
    const { pontem } = window;
    if (!this.connected || !pontem) return;
    const network = await pontem.network();

    const normalizedNetworkApi = network.api?.endsWith("/")
      ? network.api.slice(0, -1)
      : network.api;
    const normalizedLumioRpc = LUMIO_RPC.endsWith("/")
      ? LUMIO_RPC.slice(0, -1)
      : LUMIO_RPC;

    if (
      normalizedNetworkApi !== normalizedLumioRpc ||
      !network.chainId ||
      parseInt(network.chainId, 10) !== CHAIN_ID
    ) {
      throw new Error(
        `Please connect to the Lumio network and switch to the correct chain.

        RPC: ${LUMIO_RPC}
        CHAIN ID: ${CHAIN_ID}`,
      );
    }

    // const result = await pontem.signTransaction({
    //   function: "0x1::coin::transfer",
    //   type_arguments: [COIN_TYPE],
    //   arguments: ["0x1", "100"],
    // });
  }
}

const authState = new AuthState();

const AuthContext = createContext<AuthState>(authState);

export const useAuthWallet = (): AuthState => {
  const auth = useContext(AuthContext);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!auth.initialized) {
      auth.init().then(() => {
        forceUpdate((n) => n + 1);
      });
    }
  }, []);

  return auth;
};
