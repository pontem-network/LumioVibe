#!/bin/bash
# Generate React hooks
# Usage: source this file, then call generate_hooks

generate_hooks() {
    local OUTPUT_DIR="$1"
    local DEPLOYER_ADDRESS="$2"

    # src/hooks/usePontem.ts
    cat > "$OUTPUT_DIR/frontend/src/hooks/usePontem.ts" <<'HOOK_EOF'
import { useState, useEffect, useCallback } from 'react';
import type { PontemProvider, PontemNetwork } from '../types/pontem';
import { LUMIO_CHAIN_ID, IS_TEST_MODE, TEST_ADDRESS } from '../types/pontem';

export function usePontem() {
  const [pontem, setPontem] = useState<PontemProvider | undefined>(undefined);
  const [connected, setConnected] = useState(IS_TEST_MODE);
  const [account, setAccount] = useState<string | null>(IS_TEST_MODE ? TEST_ADDRESS : null);
  const [network, setNetwork] = useState<PontemNetwork | null>(
    IS_TEST_MODE ? { name: 'Lumio Testnet', api: 'https://api.testnet.lumio.io/v1', chainId: 2 } : null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_TEST_MODE) return;

    const setup = () => {
      if (typeof window !== 'undefined' && window.pontem) {
        setPontem(window.pontem);
        window.pontem.isConnected().then(isConn => {
          if (isConn) {
            window.pontem!.account().then(setAccount);
            window.pontem!.network().then(setNetwork);
            setConnected(true);
          }
        });
        window.pontem.onChangeAccount((addr) => {
          setAccount(addr || null);
          setConnected(!!addr);
        });
        window.pontem.onChangeNetwork((net) => {
          setNetwork(net);
          if (net.chainId !== LUMIO_CHAIN_ID) {
            setError('Please switch to Lumio Testnet');
          } else {
            setError(null);
          }
        });
      }
    };
    setup();
    window.addEventListener('pontemWalletInjected', setup);
    const timeout = setTimeout(setup, 500);
    return () => {
      window.removeEventListener('pontemWalletInjected', setup);
      clearTimeout(timeout);
    };
  }, []);

  const connect = useCallback(async () => {
    if (IS_TEST_MODE) {
      setConnected(true);
      setAccount(TEST_ADDRESS);
      return true;
    }
    if (!pontem) {
      setError('Install Pontem Wallet from pontem.network');
      return false;
    }
    try {
      const result = await pontem.connect();
      const addr = typeof result === 'string' ? result : result.address;
      setAccount(addr);
      setConnected(true);
      const net = await pontem.network();
      setNetwork(net);
      if (net.chainId !== LUMIO_CHAIN_ID) {
        try { await pontem.switchNetwork(LUMIO_CHAIN_ID); }
        catch { setError('Please switch to Lumio Testnet'); }
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      return false;
    }
  }, [pontem]);

  const disconnect = useCallback(async () => {
    if (IS_TEST_MODE) {
      setConnected(false);
      setAccount(null);
      return;
    }
    if (pontem) {
      await pontem.disconnect();
      setAccount(null);
      setConnected(false);
    }
  }, [pontem]);

  return {
    pontem,
    connected,
    account,
    network,
    error,
    connect,
    disconnect,
    isInstalled: IS_TEST_MODE || !!pontem,
    isTestMode: IS_TEST_MODE,
  };
}
HOOK_EOF

    # src/hooks/useContract.ts
    cat > "$OUTPUT_DIR/frontend/src/hooks/useContract.ts" <<HOOK_EOF
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePontem } from './usePontem';
import { LUMIO_RPC, IS_TEST_MODE, TEST_PRIVATE_KEY } from '../types/pontem';
import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';

const CONTRACT_ADDRESS = '$DEPLOYER_ADDRESS';
// ⚠️ CRITICAL: Change MODULE_NAME to match your actual Move module!
// Example: 'moon_coin', 'voting', 'nft_marketplace', etc.
const MODULE_NAME = 'counter';

const lumioConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: LUMIO_RPC,
});
const aptos = new Aptos(lumioConfig);

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
          function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
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
        function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
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
      const res = await fetch(\`\${LUMIO_RPC}/view\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: \`\${CONTRACT_ADDRESS}::\${MODULE_NAME}::\${fn}\`,
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

  // ⚠️ CRITICAL: These are EXAMPLE functions for a counter contract!
  // You MUST update these to match YOUR contract's entry and view functions!
  //
  // Example for a staking contract:
  //   const stake = useCallback((amount: number) => callEntry('stake_lumio', [amount.toString()]), [callEntry]);
  //   const unstake = useCallback((amount: number) => callEntry('unstake_lumio', [amount.toString()]), [callEntry]);
  //   const getStakingInfo = useCallback((addr: string) => callView<[number,number,number,number]>('get_staking_info', [addr]), [callView]);
  //
  // ⚠️ NEVER use mock/hardcoded data! ALL data must come from callView!

  const initialize = useCallback(() => callEntry('initialize'), [callEntry]);
  const increment = useCallback(() => callEntry('increment'), [callEntry]);
  const getCount = useCallback((addr: string) => callView<number>('get_value', [addr]), [callView]);
  const isInitialized = useCallback((addr: string) => callView<boolean>('exists_at', [addr]), [callView]);

  return {
    // ⚠️ Update these exports to include YOUR contract functions!
    initialize, increment, getCount, isInitialized,
    callEntry, callView, loading, error, account,
    contractAddress: CONTRACT_ADDRESS,
    isTestMode: IS_TEST_MODE,
  };
}
HOOK_EOF
}
