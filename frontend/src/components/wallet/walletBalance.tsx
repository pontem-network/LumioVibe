import { useEffect, useState } from "react";
import "./wallet.css";
import { useAuthWallet } from "#/hooks/use-auth";

const UPDATE_INTERVAL = 30000;

export function WalletDisplayBalance() {
  const balanceLabelText = "balance";
  const coinName = "Lum";

  const auth = useAuthWallet();
  const [balance, setBalance] = useState(0.0);

  useEffect(() => {
    if (!auth.connected) return undefined;

    auth.balance().then(setBalance);

    const interval = setInterval(() => {
      if (auth.connected) {
        auth.balance().then(setBalance);
      }
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [auth, auth.connected]);

  if (!auth.connected) return null;

  return (
    <div className="wallet_view_balance">
      <span className="label">{balanceLabelText}:</span>
      <span className="value">
        {balance} {coinName}
      </span>
    </div>
  );
}
