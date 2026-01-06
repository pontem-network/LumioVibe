import { Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import {
  useConversationStore,
  type AgentMode,
} from "#/state/conversation-store";
import { cn } from "#/utils/utils";

interface ModeButtonProps {
  mode: AgentMode;
  label: string;
  icon: string;
  tooltip: string;
  isSelected: boolean;
  onSelect: (mode: AgentMode) => void;
}

function ModeButton({
  mode,
  label,
  icon,
  tooltip,
  isSelected,
  onSelect,
}: ModeButtonProps) {
  return (
    <Tooltip
      content={tooltip}
      closeDelay={100}
      className="bg-white text-black text-xs"
    >
      <button
        type="button"
        onClick={() => onSelect(mode)}
        className={cn(
          "px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5",
          "border border-transparent",
          isSelected
            ? "bg-[#25272D] text-white border-indigo-500/50"
            : "bg-transparent text-gray-500 hover:bg-[#25272D]/50 hover:text-gray-300",
        )}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
    </Tooltip>
  );
}

const MODES: Array<{
  mode: AgentMode;
  label: string;
  icon: string;
  tooltip: string;
}> = [
  {
    mode: "chat",
    label: "Chat",
    icon: "💬",
    tooltip: "Consultation mode - answers questions without modifying code",
  },
  {
    mode: "planning",
    label: "Planning",
    icon: "📋",
    tooltip: "Planning mode - research, analysis, and spec creation",
  },
  {
    mode: "development",
    label: "Development",
    icon: "🛠️",
    tooltip: "Development mode - full code modification capabilities",
  },
];

export function LumioModeToggles() {
  const { t } = useTranslation();
  const { agentMode, setAgentMode, skipTesting, setSkipTesting } =
    useConversationStore();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5 bg-[#1a1b1e] rounded-lg p-0.5">
        {MODES.map(({ mode, label, icon, tooltip }) => (
          <ModeButton
            key={mode}
            mode={mode}
            label={label}
            icon={icon}
            tooltip={tooltip}
            isSelected={agentMode === mode}
            onSelect={setAgentMode}
          />
        ))}
      </div>

      {agentMode === "development" && (
        <Tooltip
          content={
            !skipTesting
              ? "Testing enabled - contract tests and browser testing required"
              : "Testing disabled - skip testing phases for faster iteration"
          }
          closeDelay={100}
          className="bg-white text-black text-xs max-w-[200px]"
        >
          <button
            type="button"
            onClick={() => setSkipTesting(!skipTesting)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5",
              "border border-transparent bg-[#1a1b1e]",
              !skipTesting
                ? "text-white border-green-500/50"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <span>🧪</span>
            <span>{t("LUMIO_MODE_TOGGLES$testing")}</span>
          </button>
        </Tooltip>
      )}
    </div>
  );
}
