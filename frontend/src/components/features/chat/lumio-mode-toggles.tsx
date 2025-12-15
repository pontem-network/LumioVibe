import { Tooltip } from "@heroui/react";
import { useConversationStore } from "#/state/conversation-store";
import { cn } from "#/utils/utils";

interface ToggleButtonProps {
  label: string;
  tooltip: string;
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
}

function ToggleButton({
  label,
  tooltip,
  isEnabled,
  onToggle,
}: ToggleButtonProps) {
  return (
    <Tooltip
      content={tooltip}
      closeDelay={100}
      className="bg-white text-black text-xs"
    >
      <button
        type="button"
        onClick={() => onToggle(!isEnabled)}
        className={cn(
          "px-2 py-1 text-xs rounded-md transition-all",
          "border border-transparent",
          isEnabled
            ? "bg-[#25272D] text-white hover:bg-[#35373D]"
            : "bg-transparent text-gray-500 hover:bg-[#25272D]/50 border-gray-600",
        )}
      >
        {label}
      </button>
    </Tooltip>
  );
}

export function LumioModeToggles() {
  const {
    enableTesting,
    enableVerification,
    setEnableTesting,
    setEnableVerification,
  } = useConversationStore();

  return (
    <div className="flex items-center gap-1">
      <ToggleButton
        label="Testing"
        tooltip={
          enableTesting
            ? "Browser testing enabled - click to skip"
            : "Browser testing disabled - click to enable"
        }
        isEnabled={enableTesting}
        onToggle={setEnableTesting}
      />
      <ToggleButton
        label="Verification"
        tooltip={
          enableVerification
            ? "Data verification enabled - click to skip"
            : "Data verification disabled - click to enable"
        }
        isEnabled={enableVerification}
        onToggle={setEnableVerification}
      />
    </div>
  );
}
