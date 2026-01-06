import {
  AssistantMessageAction,
  UserMessageAction,
} from "#/types/core/actions";
import i18n from "#/i18n";
import { isUserMessage } from "#/types/core/guards";
import { stripModeSwitchTag } from "#/utils/parse-agent-mode-switch";

const stripLumioSettings = (message: string): string =>
  message.replace(/<lumio-settings[^>]*\/>\n?/g, "").trim();

const stripAllSpecialTags = (message: string): string =>
  stripModeSwitchTag(stripLumioSettings(message));

export const parseMessageFromEvent = (
  event: UserMessageAction | AssistantMessageAction,
): string => {
  const m = isUserMessage(event) ? event.args.content : event.message;
  if (!event.args.file_urls || event.args.file_urls.length === 0) {
    return stripAllSpecialTags(m);
  }
  const delimiter = i18n.t("CHAT_INTERFACE$AUGMENTED_PROMPT_FILES_TITLE");
  const parts = m.split(delimiter);

  return stripAllSpecialTags(parts[0]);
};
