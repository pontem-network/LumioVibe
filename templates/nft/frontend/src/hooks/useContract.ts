import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY, CONTRACT_ADDRESS } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const MODULE_NAME = 'nft';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

export interface CollectionInfo {
  name: string;
  description: string;
  totalMinted: number;
  maxSupply: number;
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

  const createCollection = useCallback(
    (name: string, description: string, maxSupply: number) =>
      callEntry('create_collection', [name, description, maxSupply]),
    [callEntry]
  );

  const register = useCallback(() => callEntry('register'), [callEntry]);

  const mintNFT = useCallback(
    (name: string, description: string, uri: string) =>
      callEntry('mint_nft', [name, description, uri]),
    [callEntry]
  );

  const transferNFT = useCallback(
    (to: string, tokenId: number) => callEntry('transfer_nft', [to, tokenId]),
    [callEntry]
  );

  const getCollectionInfo = useCallback(
    async (addr: string): Promise<CollectionInfo | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_collection_info`,
            type_arguments: [],
            arguments: [addr],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          name: data[0],
          description: data[1],
          totalMinted: parseInt(data[2]),
          maxSupply: parseInt(data[3]),
        };
      } catch {
        return null;
      }
    },
    []
  );

  const getNFTCount = useCallback(
    (addr: string) => callView<number>('get_nft_count', [addr]),
    [callView]
  );

  const getTotalMinted = useCallback(
    (addr: string) => callView<number>('get_total_minted', [addr]),
    [callView]
  );

  const collectionExists = useCallback(
    (addr: string) => callView<boolean>('collection_exists', [addr]),
    [callView]
  );

  const hasStore = useCallback(
    (addr: string) => callView<boolean>('has_store', [addr]),
    [callView]
  );

  return {
    createCollection,
    register,
    mintNFT,
    transferNFT,
    getCollectionInfo,
    getNFTCount,
    getTotalMinted,
    collectionExists,
    hasStore,
    callEntry,
    callView,
    loading,
    error,
    account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
