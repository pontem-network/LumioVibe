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

export interface NFTInfo {
  id: number;
  name: string;
  description: string;
  uri: string;
  creator: string;
  owner: string;
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

  const mintNFT = useCallback(
    (name: string, description: string, uri: string) =>
      callEntry('mint_nft', [name, description, uri]),
    [callEntry]
  );

  // Transfer now requires collection_addr as first arg
  const transferNFT = useCallback(
    (to: string, tokenId: number) =>
      callEntry('transfer_nft', [CONTRACT_ADDRESS, to, tokenId]),
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

  // get_nft_count now takes collection_addr and owner
  const getNFTCount = useCallback(
    async (collectionAddr: string, owner: string): Promise<number | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_nft_count`,
            type_arguments: [],
            arguments: [collectionAddr, owner],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return parseInt(data[0]);
      } catch {
        return null;
      }
    },
    []
  );

  const getTotalMinted = useCallback(
    (addr: string) => callView<number>('get_total_minted', [addr]),
    [callView]
  );

  const collectionExists = useCallback(
    (addr: string) => callView<boolean>('collection_exists', [addr]),
    [callView]
  );

  // Get NFT by ID - returns full info including owner
  const getNFTById = useCallback(
    async (collectionAddr: string, tokenId: number): Promise<NFTInfo | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_nft_by_id`,
            type_arguments: [],
            arguments: [collectionAddr, String(tokenId)],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: parseInt(data[0]),
          name: data[1],
          description: data[2],
          uri: data[3],
          creator: data[4],
          owner: data[5],
        };
      } catch {
        return null;
      }
    },
    []
  );

  // Get all NFT IDs owned by a specific address
  const getNFTsByOwner = useCallback(
    async (collectionAddr: string, owner: string): Promise<number[]> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_nfts_by_owner`,
            type_arguments: [],
            arguments: [collectionAddr, owner],
          }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data[0] as string[]).map(id => parseInt(id));
      } catch {
        return [];
      }
    },
    []
  );

  // Get all NFT IDs in the collection
  const getAllNFTIds = useCallback(
    async (collectionAddr: string): Promise<number[]> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_all_nfts`,
            type_arguments: [],
            arguments: [collectionAddr],
          }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data[0] as string[]).map(id => parseInt(id));
      } catch {
        return [];
      }
    },
    []
  );

  // Get all NFTs owned by a user with full info
  const getMyNFTs = useCallback(
    async (collectionAddr: string, owner: string): Promise<NFTInfo[]> => {
      const ids = await getNFTsByOwner(collectionAddr, owner);
      const nfts: NFTInfo[] = [];
      for (const id of ids) {
        const nft = await getNFTById(collectionAddr, id);
        if (nft) nfts.push(nft);
      }
      return nfts;
    },
    [getNFTsByOwner, getNFTById]
  );

  // Get all NFTs in collection with full info
  const getAllNFTs = useCallback(
    async (collectionAddr: string): Promise<NFTInfo[]> => {
      const ids = await getAllNFTIds(collectionAddr);
      const nfts: NFTInfo[] = [];
      for (const id of ids) {
        const nft = await getNFTById(collectionAddr, id);
        if (nft) nfts.push(nft);
      }
      return nfts;
    },
    [getAllNFTIds, getNFTById]
  );

  return {
    createCollection,
    mintNFT,
    transferNFT,
    getCollectionInfo,
    getNFTCount,
    getTotalMinted,
    collectionExists,
    getNFTById,
    getNFTsByOwner,
    getAllNFTIds,
    getMyNFTs,
    getAllNFTs,
    callEntry,
    callView,
    loading,
    error,
    account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
