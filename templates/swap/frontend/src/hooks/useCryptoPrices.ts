import { useState, useEffect, useCallback } from 'react';

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  icon: string;
}

// Map symbols to CoinGecko IDs
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  NEAR: 'near',
  FTM: 'fantom',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  RENDER: 'render-token',
  FET: 'fetch-ai',
  IMX: 'immutable-x',
  SEI: 'sei-network',
  USDC: 'usd-coin',
  USDT: 'tether',
  WBTC: 'wrapped-bitcoin',
};

const SYMBOL_ICONS: Record<string, string> = {
  BTC: '₿', ETH: '⟠', SOL: '◎', BNB: '💛', XRP: '✕', ADA: '◈',
  AVAX: '🔺', DOGE: '🐕', DOT: '●', LINK: '⬡', MATIC: '⬡', SHIB: '🐕',
  LTC: 'Ł', UNI: '🦄', ATOM: '⚛', APT: '🔷', ARB: '🔵', OP: '🔴',
  SUI: '💧', TIA: '☀', INJ: '💉', NEAR: '◎', FTM: '👻', PEPE: '🐸',
  WIF: '🐕', RENDER: '🎨', FET: '🤖', IMX: '🎮', SEI: '🌊',
  USDC: '💵', USDT: '💲', WBTC: '₿', '3LD': '✦',
};

// Fallback prices (used as initial state and when API fails)
const FALLBACK_PRICES: Record<string, { price: number; change24h: number }> = {
  BTC: { price: 94521, change24h: 2.34 },
  ETH: { price: 3420, change24h: 1.87 },
  SOL: { price: 187.50, change24h: 5.23 },
  BNB: { price: 689.20, change24h: -0.45 },
  XRP: { price: 2.15, change24h: 3.12 },
  ADA: { price: 0.98, change24h: -1.23 },
  AVAX: { price: 38.90, change24h: 4.56 },
  DOGE: { price: 0.32, change24h: 8.92 },
  DOT: { price: 7.45, change24h: -2.10 },
  LINK: { price: 22.30, change24h: 3.45 },
  MATIC: { price: 0.52, change24h: 1.23 },
  SHIB: { price: 0.000022, change24h: 12.45 },
  LTC: { price: 105.20, change24h: -0.78 },
  UNI: { price: 13.80, change24h: 2.67 },
  ATOM: { price: 10.50, change24h: 4.12 },
  APT: { price: 9.25, change24h: 6.78 },
  ARB: { price: 1.15, change24h: 3.21 },
  OP: { price: 2.45, change24h: -1.56 },
  SUI: { price: 4.20, change24h: 7.89 },
  TIA: { price: 8.90, change24h: 5.43 },
  INJ: { price: 35.60, change24h: 9.12 },
  NEAR: { price: 5.30, change24h: 2.34 },
  FTM: { price: 0.78, change24h: 4.56 },
  PEPE: { price: 0.000019, change24h: 15.67 },
  WIF: { price: 2.85, change24h: 11.23 },
  RENDER: { price: 7.20, change24h: 3.45 },
  FET: { price: 2.10, change24h: 6.78 },
  IMX: { price: 1.85, change24h: 4.32 },
  SEI: { price: 0.48, change24h: 8.90 },
  USDC: { price: 1.00, change24h: 0.01 },
  USDT: { price: 1.00, change24h: 0.00 },
  WBTC: { price: 94450, change24h: 2.31 },
  '3LD': { price: 0.0847, change24h: 12.50 },
};

const formatPrice = (price: number | null | undefined): string => {
  if (price == null) return '$0.00';
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(6)}`;
  }
};

const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(0)}M`;
  return `$${volume.toLocaleString()}`;
};

interface PriceState {
  prices: Map<string, CryptoPrice>;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

// Create a singleton to share state across components
let globalState: PriceState = {
  prices: new Map(),
  isLoading: true,
  lastUpdated: null,
  error: null,
};

let listeners: Set<() => void> = new Set();
let fetchInterval: NodeJS.Timeout | null = null;

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const fetchPrices = async () => {
  const ids = Object.values(SYMBOL_TO_ID).join(',');

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const data = await response.json();
    const newPrices = new Map<string, CryptoPrice>();

    // Map API response to our format
    for (const coin of data) {
      const symbol = Object.entries(SYMBOL_TO_ID).find(([, id]) => id === coin.id)?.[0];
      if (symbol) {
        const fallbackData = FALLBACK_PRICES[symbol];
        newPrices.set(symbol, {
          symbol,
          name: coin.name,
          price: coin.current_price ?? fallbackData?.price ?? 0,
          change24h: coin.price_change_percentage_24h ?? fallbackData?.change24h ?? 0,
          volume24h: coin.total_volume || 0,
          marketCap: coin.market_cap || 0,
          icon: SYMBOL_ICONS[symbol] || '●',
        });
      }
    }

    // Add 3LD with simulated price (not on CoinGecko)
    const threeLdBase = FALLBACK_PRICES['3LD'];
    const randomChange = (Math.random() - 0.5) * 0.002; // Small random fluctuation
    newPrices.set('3LD', {
      symbol: '3LD',
      name: '3LD',
      price: threeLdBase.price * (1 + randomChange),
      change24h: threeLdBase.change24h + (Math.random() - 0.5) * 2,
      volume24h: 45000000,
      marketCap: 84700000,
      icon: '✦',
    });

    globalState = {
      prices: newPrices,
      isLoading: false,
      lastUpdated: new Date(),
      error: null,
    };

    notifyListeners();
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);

    // Use fallback prices on error
    if (globalState.prices.size === 0) {
      const fallbackMap = new Map<string, CryptoPrice>();
      Object.entries(FALLBACK_PRICES).forEach(([symbol, data]) => {
        fallbackMap.set(symbol, {
          symbol,
          name: symbol,
          price: data.price,
          change24h: data.change24h,
          volume24h: 0,
          marketCap: 0,
          icon: SYMBOL_ICONS[symbol] || '●',
        });
      });
      globalState = {
        prices: fallbackMap,
        isLoading: false,
        lastUpdated: new Date(),
        error: 'Using cached prices',
      };
      notifyListeners();
    }
  }
};

// Start fetching on module load
if (typeof window !== 'undefined') {
  fetchPrices();
  fetchInterval = setInterval(fetchPrices, 30000); // Update every 30 seconds
}

export const useCryptoPrices = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getPrice = useCallback((symbol: string): CryptoPrice | null => {
    return globalState.prices.get(symbol) || null;
  }, []);

  const getFormattedPrice = useCallback((symbol: string): string => {
    const price = globalState.prices.get(symbol);
    if (!price) {
      const fallback = FALLBACK_PRICES[symbol];
      return fallback ? formatPrice(fallback.price) : '$0.00';
    }
    return formatPrice(price.price);
  }, []);

  const getAllPrices = useCallback((): CryptoPrice[] => {
    return Array.from(globalState.prices.values());
  }, []);

  const getFormattedVolume = useCallback((symbol: string): string => {
    const price = globalState.prices.get(symbol);
    return price ? formatVolume(price.volume24h) : '$0';
  }, []);

  return {
    prices: globalState.prices,
    isLoading: globalState.isLoading,
    lastUpdated: globalState.lastUpdated,
    error: globalState.error,
    getPrice,
    getFormattedPrice,
    getAllPrices,
    getFormattedVolume,
    formatPrice,
    formatVolume,
  };
};

export { formatPrice, formatVolume, SYMBOL_ICONS, FALLBACK_PRICES };
