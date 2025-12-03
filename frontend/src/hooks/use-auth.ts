/* eslint max-classes-per-file: "off" */

import {
  PontemWindow,
  SignMessagePayload,
  SignMessageResponse,
} from "@pontem/aptos-wallet-adapter";
import { createContext, useContext } from "react";
import { getConfig, LumioConfig } from "#/services/vibe-balance";

declare const window: PontemWindow;

const DECIMALS = 8;
const NUMBER_OF_DECIMALS = 4;

type SignMessageWithoutSignature = Omit<SignMessageResponse, "signature">;

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
async function fetchWithProc<T>(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  let ans: object | string = await response.json();

  if (!response.ok) {
    if (typeof ans === "object" && "detail" in ans) ans = ans.detail as string;
    throw new Error(`${response.status}: ${ans}`);
  }

  return ans as T;
}

class AuthToken {
  static STORAGE_NAME: string = "auth_token";

  token: string | null = null;

  account: string | null = null;

  verified_token: boolean | false = false;

  nonce: string = "";

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
    if (this.token === null || this.account === null) {
      this.set_defaults();
      return false;
    }

    const token: AuthToken = await fetchWithProc("/api/token/status", {
      method: "POST",
      body: JSON.stringify(this),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    Object.assign(this, token);
    return this.verified_token;
  }

  protected async new(): Promise<boolean> {
    this.set_defaults();

    if (!window.pontem) return false;
    this.account = await window.pontem?.account();

    const newToken: AuthToken = await fetchWithProc("/api/token/new", {
      method: "POST",
      body: JSON.stringify(this),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    Object.assign(this, newToken);
    this.save();

    const newTokenString = JSON.stringify(newToken);

    const { success, result: signMessage } = await window.pontem.signMessage(
      new Message(newTokenString, newToken.nonce),
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

    const verifyToken: AuthToken = await fetchWithProc("/api/token/verify", {
      method: "POST",
      body: JSON.stringify(signNormalize),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    Object.assign(this, verifyToken);
    this.save();

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

  token: AuthToken = new AuthToken(true);

  lumio_settings: LumioConfig = getConfig();

  async init(): Promise<AuthState> {
    const { pontem } = window;

    if (!pontem || !(await pontem.isConnected())) return this;
    if (!(await this.token.check())) return this;

    this.connected = true;

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

    const success: boolean = await fetchWithProc("/api/token", {
      method: "DELETE",
    });
    if (success) Object.assign(this, new AuthState());
  }

  async balance(): Promise<number> {
    const { pontem } = window;
    if (!this.connected || !pontem) return 0;
    const { account } = this.token;

    if (!account) return 0.0;

    const balanceResponse: number[] = await fetchWithProc(
      `${this.lumio_settings.rpcUrl}v1/view`,
      {
        method: "POST",
        body: JSON.stringify({
          function: `${this.lumio_settings.contractAddress}::vibe_balance::get_balance`,
          type_arguments: [],
          arguments: [this.token.account],
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (balanceResponse.constructor === Array) {
      const balance: number =
        Math.round(balanceResponse[0] / 10 ** (DECIMALS - NUMBER_OF_DECIMALS)) /
        10 ** NUMBER_OF_DECIMALS;

      return balance;
    }

    return 0.0;
  }

  async topUpBalance(amount: number = 1000): Promise<void> {
    const { pontem } = window;
    if (!this.connected || !pontem) return;
    const network = await pontem.network();

    if (network.api?.indexOf(this.lumio_settings.rpcUrl) === -1) {
      throw new Error(
        `Please connect to the Lumio network and switch to the correct chain.

        RPC: ${this.lumio_settings.rpcUrl}`,
      );
    }

    const { success } = await pontem.signAndSubmit({
      function: `${this.lumio_settings.contractAddress}::vibe_balance::deposit`,
      arguments: [amount.toString()],
    });

    if (!success) throw new Error("Failed to top up the balance");
  }
}

const AuthContext = createContext<AuthState>(await new AuthState().init());
export const useAuthWallet = (): AuthState => useContext(AuthContext);
