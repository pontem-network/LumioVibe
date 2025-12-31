import ServerIcon from "#/icons/server.svg?react";
import { TooltipButton } from "./tooltip-button";
import { cn } from "#/utils/utils";
import { useAuthWallet } from "#/hooks/use-auth";

interface DeploymentsButtonProps {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function DeploymentsButton({
  isOpen,
  onClick,
  disabled = false,
}: DeploymentsButtonProps) {
  if (!useAuthWallet().connected) return null;

  return (
    <TooltipButton
      testId="toggle-deployments-panel"
      tooltip="Hosting"
      ariaLabel="Hosting"
      onClick={onClick}
      disabled={disabled}
    >
      <ServerIcon
        width={24}
        height={24}
        className={cn(
          "cursor-pointer",
          isOpen ? "text-white" : "text-[#B1B9D3]",
          disabled && "opacity-50",
        )}
      />
    </TooltipButton>
  );
}
