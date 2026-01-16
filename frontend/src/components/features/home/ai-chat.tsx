import React from "react";
import { useTranslation } from "react-i18next";
import { InteractiveChatBox } from "#/components/features/chat/interactive-chat-box";
import { useSendMessage } from "#/hooks/use-send-message";
import { createChatMessage } from "#/services/chat-service";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useEventStore } from "#/stores/use-event-store";
import { useConversationStore } from "#/state/conversation-store";
import { useWsClient } from "#/context/ws-client-provider";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";
import { useUnifiedUploadFiles } from "#/hooks/mutation/use-unified-upload-files";
import { validateFiles } from "#/utils/file-validation";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { TypingIndicator } from "#/components/features/chat/typing-indicator";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { useScrollToBottom } from "#/hooks/use-scroll-to-bottom";
import { useTaskPolling } from "#/hooks/query/use-task-polling";
import { useConversationWebSocket } from "#/contexts/conversation-websocket-context";
import { isV0Event, isV1Event } from "#/types/v1/type-guards";
import { isActionOrObservation } from "#/types/core/guards";
import {
  hasUserEvent,
  shouldRenderEvent,
} from "#/components/features/chat/event-content-helpers/should-render-event";
import {
  shouldRenderEvent as shouldRenderV1Event,
  Messages as V1Messages,
  hasUserEvent as hasV1UserEvent,
} from "#/components/v1/chat";
import { Messages as V0Messages } from "#/components/features/chat/messages";
import { ScrollToBottomButton } from "#/components/shared/buttons/scroll-to-bottom-button";
import ConfirmationModeEnabled from "../chat/confirmation-mode-enabled";

/**
 * Custom hook that controls the visibility of V1 messages with proper timing
 * to avoid layout issues during history loading.
 *
 * Purpose:
 * - Prevents flickering or incorrect layout when rendering loaded messages.
 * - Ensures messages are only shown *after* the DOM has fully rendered
 *   the chat container by deferring visibility to the next animation frame.
 *
 * State transitions:
 * - When loading starts: hides messages immediately.
 * - When loading finishes: waits for next frame (via rAF) before showing messages.
 *
 * @param isLoadingHistory - Indicates if message history is currently being loaded
 * @returns Boolean indicating whether V1 messages should be visible
 *
 * @example
 * const showV1Messages = useV1MessagesVisibility(conversationWebSocket?.isLoadingHistory);
 * return <div>{showV1Messages && <MessageList />}</div>;
 */
function useV1MessagesVisibility(
  isLoadingHistory: boolean | undefined,
): boolean {
  // Internal state to control message visibility
  const [showV1Messages, setShowV1Messages] = React.useState(false);

  // Persist previous loading state across renders
  const prevLoadingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    const isLoading = !!isLoadingHistory;

    // Case: Loading just completed → show messages on next frame
    if (wasLoading && !isLoading) {
      requestAnimationFrame(() => {
        setShowV1Messages(true);
      });
    }
    // Case: Loading started → hide messages immediately
    else if (isLoading) {
      setShowV1Messages(false);
    }

    // Update ref for next render
    prevLoadingRef.current = isLoading;
  }, [isLoadingHistory]);

  return showV1Messages;
}

/*
 * Chat for interacting with AI on the home page
 */
export function AIHomeChat() {
  const { setMessageToSend, agentMode, skipTesting } = useConversationStore();
  const conversation = useActiveConversation()?.data;
  const conversationId = conversation?.conversation_id;

  const { isLoadingMessages } = useWsClient();
  const { isTask } = useTaskPolling();
  const conversationWebSocket = useConversationWebSocket();

  const { send } = useSendMessage();

  const storeEvents = useEventStore((state) => state.events);
  const uiEvents = useEventStore((state) => state.uiEvents);

  const { setOptimisticUserMessage } = useOptimisticUserMessageStore();
  const { t } = useTranslation();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollDomToBottom, onChatBodyScroll, hitBottom } =
    useScrollToBottom(scrollRef);

  const { curAgentState } = useAgentState();

  const { mutateAsync: uploadFiles } = useUnifiedUploadFiles();

  const isV1Conversation = conversation?.conversation_version === "V1";

  // Wait for DOM to render before showing V1 messages
  const showV1Messages = useV1MessagesVisibility(
    conversationWebSocket?.isLoadingHistory,
  );

  // Filter V0 events
  const v0Events = storeEvents
    .filter(isV0Event)
    .filter(isActionOrObservation)
    .filter(shouldRenderEvent);

  // Filter V1 events - use uiEvents for rendering (actions replaced by observations)
  const v1UiEvents = uiEvents.filter(isV1Event).filter(shouldRenderV1Event);

  // Keep full v1 events for lookups (includes both actions and observations)
  const v1FullEvents = storeEvents.filter(isV1Event);

  const handleSendMessage = async (
    content: string,
    originalImages: File[],
    originalFiles: File[],
  ) => {
    if (!conversationId) return;
    // Create mutable copies of the arrays
    const images = [...originalImages];
    const files = [...originalFiles];

    // Validate file sizes before any processing
    const allFiles = [...images, ...files];
    const validation = validateFiles(allFiles);

    if (!validation.isValid) {
      displayErrorToast(`Error: ${validation.errorMessage}`);
      return; // Stop processing if validation fails
    }

    const promises = images.map((image) => convertImageToBase64(image));
    const imageUrls = await Promise.all(promises);

    const timestamp = new Date().toISOString();

    const { skipped_files: skippedFiles, uploaded_files: uploadedFiles } =
      files.length > 0
        ? await uploadFiles({ conversationId, files })
        : { skipped_files: [], uploaded_files: [] };

    skippedFiles.forEach((f) => displayErrorToast(f.reason));

    const filePrompt = `${t("CHAT_INTERFACE$AUGMENTED_PROMPT_FILES_TITLE")}: ${uploadedFiles.join("\n\n")}`;
    let prompt =
      uploadedFiles.length > 0 ? `${content}\n\n${filePrompt}` : content;

    const lumioSettings = `<lumio-settings mode="${agentMode}" skip-tests="${skipTesting}" />`;
    prompt = `${lumioSettings}\n${prompt}`;

    send(createChatMessage(prompt, imageUrls, uploadedFiles, timestamp));
    setOptimisticUserMessage(content);
    setMessageToSend("");
  };

  const v0UserEventsExist = hasUserEvent(v0Events);
  const v1UserEventsExist = hasV1UserEvent(v1FullEvents);

  console.log("storeEvents: ", storeEvents);
  console.log("uiEvents: ", uiEvents);

  return (
    <div className="ai-chat">
      <div className="ai-chat__header">
        <h2 className="ai-chat__title">{t("AI_CHAT$TITLE")}</h2>
        <div className="ai-chat__subtitle">{t("AI_CHAT$SUBTITLE")}</div>
      </div>

      <div className="ai-chat__container">
        {/* @todo Changeable size of this block? */}
        <div
          ref={scrollRef}
          onScroll={(e) => onChatBodyScroll(e.currentTarget)}
          className="ai-chat__messages custom-scrollbar-always fast-smooth-scroll"
        >
          {!isTask &&
            ((isLoadingMessages && !isV1Conversation) ||
              ((conversationWebSocket?.isLoadingHistory || !showV1Messages) &&
                isV1Conversation)) && (
              <div className="ai-chat__messages--loading">
                <LoadingSpinner size="small" />
              </div>
            )}

          {!isLoadingMessages && v0UserEventsExist && (
            <V0Messages
              messages={v0Events}
              isAwaitingUserConfirmation={
                curAgentState === AgentState.AWAITING_USER_CONFIRMATION
              }
            />
          )}

          {showV1Messages && v1UserEventsExist && (
            <V1Messages messages={v1UiEvents} allEvents={v1FullEvents} />
          )}
        </div>

        <div className="ai-chat__controls">
          <div className="ai-chat__indicators">
            <div className="ai-chat__confirmation">
              <ConfirmationModeEnabled />
            </div>

            <div className="ai-chat__typing-indicator">
              {curAgentState === AgentState.RUNNING && <TypingIndicator />}
            </div>

            {!hitBottom && <ScrollToBottomButton onClick={scrollDomToBottom} />}
          </div>

          <InteractiveChatBox onSubmit={handleSendMessage} />

          {/* Выбор режимов общения */}
          {/* <div className="flex justify-start px-1">
            <LumioModeToggles />
          </div> */}
        </div>
      </div>
    </div>
  );
}
