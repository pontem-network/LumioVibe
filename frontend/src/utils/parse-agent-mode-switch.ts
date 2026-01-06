import type { AgentMode } from "#/state/conversation-store";

const VALID_MODES: AgentMode[] = ["chat", "planning", "development"];

export const parseAgentModeSwitch = (message: string): AgentMode | null => {
  const match = message.match(
    /<switch-mode>(chat|planning|development)<\/switch-mode>/,
  );
  if (match && VALID_MODES.includes(match[1] as AgentMode)) {
    return match[1] as AgentMode;
  }
  return null;
};

export const stripModeSwitchTag = (message: string): string =>
  message
    .replace(
      /<switch-mode>(?:chat|planning|development)<\/switch-mode>\n?/g,
      "",
    )
    .trim();
