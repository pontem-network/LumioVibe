import "./auth_wallet.css";
import { Logo } from "../features/logo/logo";

export function WalletPage() {
  const text = [
    "To access it, you must log in via the Pontem wallet.",
    "To install, visit the ",
    "page",
  ];

  return (
    <div id="wallet_page">
      <Logo size={1.4} />
      <p>
        {text[0]}
        <br />
        {text[1]}
        <a href="https://pontem.network/pontem-wallet">{text[2]}</a>
      </p>
    </div>
  );
}
