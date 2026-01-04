import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY, CONTRACT_ADDRESS } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const MODULE_NAME = 'staking';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

export interface PoolInfo {
  totalStaked: number;
  rewardPool: number;
  isActive: boolean;
}

export interface UserStakeInfo {
  stakedAmount: number;
  rewardsEarned: number;
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

  const initializePool = useCallback(
    (initialRewards: number) => callEntry('initialize_pool', [initialRewards]),
    [callEntry]
  );

  const stake = useCallback(
    (poolAddress: string, amount: number) => callEntry('stake', [poolAddress, amount]),
    [callEntry]
  );

  const unstake = useCallback(
    (poolAddress: string, amount: number) => callEntry('unstake', [poolAddress, amount]),
    [callEntry]
  );

  const claimRewards = useCallback(
    () => callEntry('claim_rewards'),
    [callEntry]
  );

  const addRewards = useCallback(
    (amount: number) => callEntry('add_rewards', [amount]),
    [callEntry]
  );

  const getPoolInfo = useCallback(
    async (poolAddress: string): Promise<PoolInfo | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_pool_info`,
            type_arguments: [],
            arguments: [poolAddress],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          totalStaked: parseInt(data[0]),
          rewardPool: parseInt(data[1]),
          isActive: data[2],
        };
      } catch {
        return null;
      }
    },
    []
  );

  const getUserStake = useCallback(
    async (userAddress: string): Promise<UserStakeInfo | null> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_user_stake`,
            type_arguments: [],
            arguments: [userAddress],
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          stakedAmount: parseInt(data[0]),
          rewardsEarned: parseInt(data[1]),
        };
      } catch {
        return null;
      }
    },
    []
  );

  const getStakedAmount = useCallback(
    (userAddress: string) => callView<number>('get_staked_amount', [userAddress]),
    [callView]
  );

  const getPendingRewards = useCallback(
    (userAddress: string) => callView<number>('get_pending_rewards', [userAddress]),
    [callView]
  );

  const poolExists = useCallback(
    (poolAddress: string) => callView<boolean>('pool_exists', [poolAddress]),
    [callView]
  );

  const userStakeExists = useCallback(
    (userAddress: string) => callView<boolean>('user_stake_exists', [userAddress]),
    [callView]
  );

  const getBalance = useCallback(
    async (userAddress: string): Promise<number> => {
      try {
        const res = await fetch(`${LUMIO_RPC}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: '0x1::coin::balance',
            type_arguments: ['0x1::lumio_coin::LumioCoin'],
            arguments: [userAddress],
          }),
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return parseInt(data[0]) || 0;
      } catch {
        return 0;
      }
    },
    []
  );

  return {
    initializePool,
    stake,
    unstake,
    claimRewards,
    addRewards,
    getPoolInfo,
    getUserStake,
    getStakedAmount,
    getPendingRewards,
    poolExists,
    userStakeExists,
    getBalance,
    callEntry,
    callView,
    loading,
    error,
    account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
