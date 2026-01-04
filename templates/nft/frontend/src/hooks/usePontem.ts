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
