import { useTranslation } from "react-i18next";
import bLogo from "#/assets/logo.png";
import { I18nKey } from "#/i18n/declaration";
import { TooltipButton } from "./tooltip-button";

export function OpenHandsLogoButton() {
  const { t } = useTranslation();

  return (
    <TooltipButton
      tooltip={t(I18nKey.BRANDING$OPENHANDS)}
      ariaLabel={t(I18nKey.BRANDING$OPENHANDS_LOGO)}
      navLinkTo="/"
    >
      <img
        width={40}
        height={40}
        src={bLogo}
        alt={t(I18nKey.BRANDING$OPENHANDS_LOGO)}
      />
    </TooltipButton>
  );
}
