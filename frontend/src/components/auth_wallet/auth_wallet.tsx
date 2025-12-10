import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import "./auth_wallet.css";

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
        <div className="flex items-end">
          <span
            className="text-[72px] font-bold leading-none"
            style={{
              background: "linear-gradient(180deg, #FF69B4 0%, #9B30FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            BUILD
          </span>
          <span className="w-4 h-4 bg-white rounded-full mb-3 -ml-1" />
        </div>
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
