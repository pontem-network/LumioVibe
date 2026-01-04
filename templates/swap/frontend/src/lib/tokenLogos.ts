import threeLdLogo from "@/assets/3ld-logo.png";

// Token logo URLs from CoinGecko CDN
export const TOKEN_LOGOS: Record<string, string> = {
  // Major cryptocurrencies
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  
  // Layer 2 & DeFi
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  
  // Meme coins
  SHIB: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  WIF: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  
  // Other majors
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  ATOM: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  APT: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  SUI: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  TIA: "https://assets.coingecko.com/coins/images/31967/small/tia.jpg",
  INJ: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  NEAR: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  FTM: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png",
  SEI: "https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png",
  
  // AI & Gaming
  RENDER: "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
  FET: "https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg",
  IMX: "https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png",
  
  // Stablecoins
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  
  // Wrapped
  WBTC: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  WETH: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  
  // 3LD Token
  "3LD": threeLdLogo,
};

// Fallback placeholder for unknown tokens
const PLACEHOLDER_LOGO = "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png";

export const getTokenLogo = (symbol: string): string => {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_LOGOS[upperSymbol] || PLACEHOLDER_LOGO;
};
