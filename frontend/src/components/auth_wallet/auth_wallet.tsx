import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import "./auth_wallet.css";
import { Logo } from "../features/logo/logo";

export function WalletPage() {
  const { t } = useTranslation();
  const text = [
    "To access it, you must log in via the Pontem wallet.",
    "To install, visit the ",
    "page",
  ];

  return (
    <div id="wallet_page">
      <div className="flex flex-col items-center mb-12">
        <Logo />
        <span className="text-[32px] font-bold leading-5 text-white pt-4">
          {t(I18nKey.LANDING$TITLE)}
        </span>
      </div>
      <p>{text[0]}</p>
      <p>
        {text[1]}
        <a href="https://pontem.network/pontem-wallet">{text[2]}</a>
      </p>
    </div>
  );
}
