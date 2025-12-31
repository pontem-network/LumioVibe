import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { TooltipButton } from "./tooltip-button";
import PlusIcon from "#/icons/u-plus.svg?react";
import { useAuthWallet } from "#/hooks/use-auth";

interface NewAppButtonProps {
  disabled?: boolean;
}

export function NewAppButton({ disabled = false }: NewAppButtonProps) {
  const { pathname } = useLocation();

  const { t } = useTranslation();

  if (!useAuthWallet().connected) return null;

  const startNewApp = t(I18nKey.CONVERSATION$START_NEW);

  return (
    <TooltipButton
      tooltip={startNewApp}
      ariaLabel={startNewApp}
      navLinkTo="/"
      testId="new-app-button"
      disabled={disabled}
    >
      <PlusIcon
        width={24}
        height={24}
        color={pathname === "/" ? "#ffffff" : "#B1B9D3"}
      />
    </TooltipButton>
  );
}
