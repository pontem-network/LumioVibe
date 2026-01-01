import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY, CONTRACT_ADDRESS } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const MODULE_NAME = 'token';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

export function useContract() {
  const { pontem, connected, account } = usePontem();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const testAccountRef = useRef<Account | null>(null);

  useEffect(() => {
    if (IS_TEST_MODE && TEST_PRIVATE_KEY) {
      try {
        const privateKey = new Ed25519PrivateKey(TEST_PRIVATE_KEY);
        testAccountRef.current = Account.fromPrivateKey({ privateKey });
      } catch (e) {
        console.error('Failed to create test account:', e);
      }
    }
  }, []);

  const callEntryTest = useCallback(async (fn: string, args: (string | number)[] = []) => {
    if (!testAccountRef.current) {
      setError('Test account not initialized');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const tx = await aptos.transaction.build.simple({
        sender: testAccountRef.current.accountAddress,
        data: {
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
          functionArguments: args.map(a => String(a)),
        },
      });
      const signed = await aptos.transaction.sign({ signer: testAccountRef.current, transaction: tx });
      const submitted = await aptos.transaction.submit.simple({ senderAuthenticator: signed, transaction: tx });
      const result = await aptos.waitForTransaction({ transactionHash: submitted.hash });
      return { hash: submitted.hash, success: result.success };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const callEntryPontem = useCallback(async (fn: string, args: (string | number)[] = []) => {
    if (!pontem || !connected) { setError('Wallet not connected'); return null; }
    setLoading(true);
    setError(null);
    try {
      const { success, result } = await pontem.signAndSubmit({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
        arguments: args.map(a => String(a)),
        type_arguments: [],
      });
      if (!success) throw new Error('Transaction rejected');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [pontem, connected]);

  const callEntry = useCallback(async (fn: string, args: (string | number)[] = []) => {
    return IS_TEST_MODE ? callEntryTest(fn, args) : callEntryPontem(fn, args);
  }, [callEntryTest, callEntryPontem]);

  const callView = useCallback(async <T>(fn: string, args: (string | number)[] = []): Promise<T | null> => {
    try {
      const res = await fetch(`${LUMIO_RPC}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
          type_arguments: [],
          arguments: args.map(a => String(a)),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data[0] as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'View failed');
      return null;
    }
  }, []);

  const initialize = useCallback(
    (name: string, symbol: string, decimals: number) =>
      callEntry('initialize', [name, symbol, decimals]),
    [callEntry]
  );

  const register = useCallback(() => callEntry('register'), [callEntry]);

  const mint = useCallback(
    (to: string, amount: number) => callEntry('mint', [to, amount]),
    [callEntry]
  );

  const burn = useCallback(
    (amount: number) => callEntry('burn', [amount]),
    [callEntry]
  );

  const transfer = useCallback(
    (to: string, amount: number) => callEntry('transfer', [to, amount]),
    [callEntry]
  );

  const getBalance = useCallback(
    (addr: string) => callView<number>('get_balance', [addr]),
    [callView]
  );

  const getTotalSupply = useCallback(
    (tokenAddr: string) => callView<number>('get_total_supply', [tokenAddr]),
    [callView]
  );

  const getTokenInfo = useCallback(
    async (tokenAddr: string): Promise<TokenInfo | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_token_info`,
            type_arguments: [],
            arguments: [tokenAddr],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          name: data[0],
          symbol: data[1],
          decimals: parseInt(data[2]),
          totalSupply: parseInt(data[3]),
        };
      } catch {
        return null;
      }
    },
    []
  );

  const isInitialized = useCallback(
    (addr: string) => callView<boolean>('is_initialized', [addr]),
    [callView]
  );

  const isRegistered = useCallback(
    (addr: string) => callView<boolean>('is_registered', [addr]),
    [callView]
  );

  return {
    initialize,
    register,
    mint,
    burn,
    transfer,
    getBalance,
    getTotalSupply,
    getTokenInfo,
    isInitialized,
    isRegistered,
    callEntry,
    callView,
    loading,
    error,
    account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
