import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY, CONTRACT_ADDRESS, DEX_ADDRESS } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const MODULE_NAME = 'swap';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

export interface PoolInfo {
  id: number;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: number;
  reserve1: number;
  totalLpSupply: number;
  volume24h: number;
  feesCollected: number;
}

export interface DexInfo {
  totalPools: number;
  totalVolume: number;
  totalFeesCollected: number;
  isPaused: boolean;
}

export function useSwapContract() {
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

  const callEntryTest = useCallback(async (fn: string, args: (string | number | boolean)[] = []) => {
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
          functionArguments: args.map(a => typeof a === 'boolean' ? a : String(a)),
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

  const callEntryPontem = useCallback(async (fn: string, args: (string | number | boolean)[] = []) => {
    if (!pontem || !connected) { setError('Wallet not connected'); return null; }
    setLoading(true);
    setError(null);
    try {
      const { success, result } = await pontem.signAndSubmit({
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
        arguments: args.map(a => typeof a === 'boolean' ? String(a) : String(a)),
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

  const callEntry = useCallback(async (fn: string, args: (string | number | boolean)[] = []) => {
    return IS_TEST_MODE ? callEntryTest(fn, args) : callEntryPontem(fn, args);
  }, [callEntryTest, callEntryPontem]);

  const callView = useCallback(async <T>(fn: string, args: (string | number | boolean)[] = []): Promise<T | null> => {
    try {
      const payload = {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${fn}`,
        type_arguments: [],
        arguments: args.map(a => typeof a === 'boolean' ? a : String(a)),
      };
      console.log(`[callView] ${fn}`, payload);
      const res = await fetch(`${LUMIO_RPC}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[callView] ${fn} error:`, errText);
        throw new Error(errText);
      }
      const data = await res.json();
      console.log(`[callView] ${fn} result:`, data);
      return data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'View failed');
      return null;
    }
  }, []);

  // DEX Initialization
  const initializeDex = useCallback(() => callEntry('initialize'), [callEntry]);

  // User Registration
  const register = useCallback(() => callEntry('register'), [callEntry]);

  // Mint test tokens
  const mintTokens = useCallback((symbol: string, amount: number) =>
    callEntry('mint_tokens', [symbol, amount]), [callEntry]);

  // Create pool
  const createPool = useCallback((
    token0Symbol: string,
    token1Symbol: string,
    initialAmount0: number,
    initialAmount1: number
  ) => callEntry('create_pool', [
    DEX_ADDRESS,
    token0Symbol,
    token1Symbol,
    initialAmount0,
    initialAmount1
  ]), [callEntry]);

  // Add liquidity
  const addLiquidity = useCallback((
    poolId: number,
    amount0Desired: number,
    amount1Desired: number,
    amount0Min: number,
    amount1Min: number
  ) => callEntry('add_liquidity', [
    DEX_ADDRESS,
    poolId,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min
  ]), [callEntry]);

  // Remove liquidity
  const removeLiquidity = useCallback((
    poolId: number,
    lpAmount: number,
    amount0Min: number,
    amount1Min: number
  ) => callEntry('remove_liquidity', [
    DEX_ADDRESS,
    poolId,
    lpAmount,
    amount0Min,
    amount1Min
  ]), [callEntry]);

  // Swap
  const swapExactInput = useCallback((
    poolId: number,
    amountIn: number,
    minAmountOut: number,
    isToken0ToToken1: boolean
  ) => callEntry('swap_exact_input', [
    DEX_ADDRESS,
    poolId,
    amountIn,
    minAmountOut,
    isToken0ToToken1
  ]), [callEntry]);

  // View functions
  const getDexInfo = useCallback(async (): Promise<DexInfo | null> => {
    const result = await callView<[number, number, number, boolean]>('get_dex_info', [DEX_ADDRESS]);
    if (!result) return null;
    return {
      totalPools: Number(result[0]),
      totalVolume: Number(result[1]),
      totalFeesCollected: Number(result[2]),
      isPaused: result[3],
    };
  }, [callView]);

  const getPoolInfo = useCallback(async (poolId: number): Promise<PoolInfo | null> => {
    const result = await callView<[string, string, string, string, string, string, string]>(
      'get_pool_info',
      [DEX_ADDRESS, poolId]
    );
    if (!result) return null;
    return {
      id: poolId,
      token0Symbol: result[0],
      token1Symbol: result[1],
      reserve0: Number(result[2]),
      reserve1: Number(result[3]),
      totalLpSupply: Number(result[4]),
      volume24h: Number(result[5]),
      feesCollected: Number(result[6]),
    };
  }, [callView]);

  const getPoolCount = useCallback(async (): Promise<number> => {
    // View functions return arrays, e.g., [value]
    const result = await callView<[string]>('get_pool_count', [DEX_ADDRESS]);
    return result && result[0] ? Number(result[0]) : 0;
  }, [callView]);

  const getAmountOut = useCallback(async (
    poolId: number,
    amountIn: number,
    isToken0ToToken1: boolean
  ): Promise<number> => {
    // View functions return arrays
    const result = await callView<[string]>('get_amount_out', [
      DEX_ADDRESS,
      poolId,
      amountIn,
      isToken0ToToken1
    ]);
    return result && result[0] ? Number(result[0]) : 0;
  }, [callView]);

  const getTokenBalance = useCallback(async (address: string, symbol: string): Promise<number> => {
    // View functions return arrays
    const result = await callView<[string]>('get_token_balance', [address, symbol]);
    return result && result[0] ? Number(result[0]) : 0;
  }, [callView]);

  const getLpBalance = useCallback(async (address: string, poolId: number): Promise<number> => {
    // View functions return arrays
    const result = await callView<[string]>('get_lp_balance', [address, poolId]);
    return result && result[0] ? Number(result[0]) : 0;
  }, [callView]);

  const isInitialized = useCallback(async (): Promise<boolean> => {
    // View functions return arrays, e.g., [true]
    const result = await callView<[boolean]>('is_initialized', [DEX_ADDRESS]);
    return result && result[0] ? result[0] : false;
  }, [callView]);

  const isRegistered = useCallback(async (address: string): Promise<boolean> => {
    // View functions return arrays
    const result = await callView<[boolean]>('is_registered', [address]);
    return result && result[0] ? result[0] : false;
  }, [callView]);

  return {
    // Entry functions
    initializeDex,
    register,
    mintTokens,
    createPool,
    addLiquidity,
    removeLiquidity,
    swapExactInput,

    // View functions
    getDexInfo,
    getPoolInfo,
    getPoolCount,
    getAmountOut,
    getTokenBalance,
    getLpBalance,
    isInitialized,
    isRegistered,

    // Generic
    callEntry,
    callView,

    // State
    loading,
    error,
    account,
    contractAddress: CONTRACT_ADDRESS,
    dexAddress: DEX_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
