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
import ConfirmationModeEnabled from "../../chat/confirmation-mode-enabled";

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

  const h1 = "AI Chat";
  const h2 = "Ask about Move or React";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{h1}</h2>
        <div className="text-sm text-white/50">{h2}</div>
      </div>

      <div className="h-full flex flex-col justify-between pr-0 relative">
        {/* @todo Changeable size of this block? */}
        <div
          ref={scrollRef}
          onScroll={(e) => onChatBodyScroll(e.currentTarget)}
          className="custom-scrollbar-always flex flex-col grow overflow-y-auto overflow-x-hidden px-4 pt-4 gap-2 fast-smooth-scroll max-h-[400px]"
        >
          {!isTask &&
            ((isLoadingMessages && !isV1Conversation) ||
              ((conversationWebSocket?.isLoadingHistory || !showV1Messages) &&
                isV1Conversation)) && (
              <div className="flex justify-center">
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

        <div className="flex flex-col gap-[6px]">
          <div className="flex justify-between relative">
            <div className="flex items-center gap-1">
              <ConfirmationModeEnabled />
            </div>

            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0">
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
