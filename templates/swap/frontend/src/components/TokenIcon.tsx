import { useState } from "react";
import { getTokenLogo } from "@/lib/tokenLogos";

interface TokenIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const TokenIcon = ({ symbol, size = 24, className = "" }: TokenIconProps) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getTokenLogo(symbol);

  // Fallback to a gradient circle with first letter if image fails
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-primary/20 text-primary-foreground font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};
