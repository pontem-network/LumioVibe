import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { isV1Event, isV0Event } from "#/types/v1/type-guards";
import { InteractiveChatBox } from "#/components/features/chat/interactive-chat-box";
import { useSendMessage } from "#/hooks/use-send-message";
import { createChatMessage } from "#/services/chat-service";
import { useOptimisticUserMessageStore } from "#/stores/optimistic-user-message-store";
import { useEventStore } from "#/stores/use-event-store";
import {
  AgentMode,
  isAgentMode,
  useConversationStore,
} from "#/state/conversation-store";
import { useWsClient } from "#/context/ws-client-provider";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";
import { useUnifiedUploadFiles } from "#/hooks/mutation/use-unified-upload-files";
import { validateFiles } from "#/utils/file-validation";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";
import { TypingIndicator } from "#/components/features/chat/typing-indicator";
import { useScrollToBottom } from "#/hooks/use-scroll-to-bottom";
import { useConversationWebSocket } from "#/contexts/conversation-websocket-context";
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

interface AIHomeChatProp {
  conversationId: string;
  conversationVersion: "V0" | "V1";
}

interface ExtractAgentModeResult {
  agentMode: AgentMode;
  skipTesting?: boolean;
}

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
function useMessagesVisibility(isLoadingHistory: boolean | undefined): boolean {
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

/**
 * Извлечь из текста message.
 * С событиями зоопарк. Пришлось делать такой обходной путь.
 * @param event - Событие из хранилища
 * @returns Текстовое содержимое сообщения или null, если извлечение не удалось
 */
function extractEventMessageContent(event: unknown): string | null {
  // Проверка на null/undefined
  if (!event || typeof event !== "object") {
    return null;
  }

  // Проверяем, есть ли свойство message у объекта и является ли оно строкой
  if (
    "message" in event &&
    typeof (event as { message?: unknown }).message === "string"
  ) {
    return (event as { message: string }).message;
  }

  // Если не удалось извлечь сообщение
  return null;
}

/**
 * @todo добавить комментарий
 *
 * @param message - @todo
 * @returns boolean | null - @todo
 */
function extractAgentMode(message: string): ExtractAgentModeResult | null {
  // Защита от null/undefined
  if (typeof message !== "string") return null;

  // Экземпляр сообщений которые нужно искать в истории:
  // <lumio-settings mode="planning" skip-tests="true" />
  // пользователь этой командой устанавливает настройки режим работы агента, и включает/выключает тестирование
  if (/^\s*<lumio-settings/.test(message)) {
    const modeMatch = message.match(/mode\s*=\s*"([^"]+)"/);
    const modeStr = modeMatch?.[1];
    const agentMode: AgentMode | null =
      modeStr && isAgentMode(modeStr) ? modeStr : null;

    if (agentMode === null) return null;

    const skipMatch = message.match(/skip-tests\s*=\s*"([^"]+)"/);
    const skipStr = skipMatch?.[1];
    const skipTesting = skipStr?.trim().toLowerCase() !== "false";

    return { agentMode, skipTesting };
  }

  // Второй вариант которы может прийти от бэкенда
  // <switch-mode>development</switch-mode>

  const switchMatch = message.match(
    /<switch-mode[^>]*>([^<]+)<\/switch-mode>/i,
  );
  const switchMode = switchMatch?.[1]?.trim();

  const agentModeSystem: AgentMode | null =
    switchMode && isAgentMode(switchMode) ? switchMode : null;

  if (agentModeSystem) return { agentMode: agentModeSystem };

  return null;
}

/*
 * Chat for interacting with AI on the home page
 */
export function AIHomeChat({
  conversationId,
  conversationVersion,
}: AIHomeChatProp) {
  if (!conversationId || !conversationVersion)
    throw new Error("Неверный conversation id");

  const { isLoadingMessages } = useWsClient();
  const conversationWebSocket = useConversationWebSocket();
  const { send } = useSendMessage();

  // events

  // Filter V1 events - use uiEvents for rendering (actions replaced by observations)
  const v1UiEvents = useEventStore((state) => state.uiEvents)
    .filter(isV1Event)
    .filter(shouldRenderV1Event);
  const storeEvents = useEventStore((state) => state.events);
  // Filter V0 events
  const v0Events = storeEvents
    .filter(isV0Event)
    .filter(isActionOrObservation)
    .filter(shouldRenderEvent);
  // Keep full v1 events for lookups (includes both actions and observations)
  const v1FullEvents = storeEvents.filter(isV1Event);

  const {
    setMessageToSend,
    agentMode, // Переключатель режим агента.  Нужно поменять когда прогрузиться история. Иначе тут дефолтное значение
    skipTesting, // Переключатель пропускать тесты при работе проекта. Нужно поменять когда прогрузиться история. Иначе тут дефолтовое значение
    setAgentMode, // Метод для смены режима агента
    setSkipTesting, // Метода для переключения пропуска тестирования
  } = useConversationStore();
  const { setOptimisticUserMessage } = useOptimisticUserMessageStore();
  const { curAgentState } = useAgentState();
  const { mutateAsync: uploadFiles } = useUnifiedUploadFiles();
  // Wait for DOM to render before showing V1 messages
  const showV1Messages = useMessagesVisibility(
    conversationWebSocket?.isLoadingHistory,
  );

  const { t } = useTranslation();

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollDomToBottom, onChatBodyScroll, hitBottom } =
    useScrollToBottom(scrollRef);

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

    // Первое сообщение в чате от пользователя должно быть с префиксом переключения на режим планирования
    // <lumio-settings mode="planning" skip-tests="true" />
    const lumioSettings = `<lumio-settings mode="planning" skip-tests="true" />`;
    prompt = `${lumioSettings}\n${prompt}`;

    send(createChatMessage(prompt, imageUrls, uploadedFiles, timestamp));
    setOptimisticUserMessage(content);
    setMessageToSend("");
  };

  const v0UserEventsExist = hasUserEvent(v0Events);
  const v1UserEventsExist = hasV1UserEvent(v1FullEvents);
  const navigate = useNavigate(); // Получаем функцию навигации

  // проанализировать текущий режим из истории сообщений и установить режим и тестирование связи с ними.
  // Инициализировать только когда будут доступны все сообщения для обработки.
  if (!isLoadingMessages) {
    const lastMode = storeEvents
      .map(extractEventMessageContent)
      .filter((x): x is string => x !== null)
      .map(extractAgentMode)
      .filter((x): x is ExtractAgentModeResult => x !== null)
      .at(-1); // взять последний статус если он есть

    if (lastMode) {
      // Сравнить найденный режим с тем что установлено в agentMode. Если они не совпадают, то установить через setAgentMode.
      if (agentMode !== lastMode.agentMode) setAgentMode(lastMode.agentMode); // установить режим из истории сообщений
      // Сравнить найдены режим тестирования, c тем что установлено в skipTesting. Ecли они не совпадают, то установить через setSkipTesting.
      if (
        lastMode.skipTesting !== undefined &&
        lastMode.skipTesting !== skipTesting
      )
        setSkipTesting(lastMode.skipTesting); // установить режим тестирования из истории сообщений

      // Режим разработке только на странице диалога. Только если режим был устновлен или пользователем или бэкэндом
      if (agentMode === "development")
        navigate(`/conversations/${conversationId}`);
    }
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat__header">
        <h2 className="ai-chat__title">{t("AI_CHAT$TITLE")}</h2>
        <div className="ai-chat__subtitle">{t("AI_CHAT$SUBTITLE")}</div>
      </div>

      <div className="ai-chat__container">
        <div
          ref={scrollRef}
          onScroll={(e) => onChatBodyScroll(e.currentTarget)}
          className="ai-chat__messages custom-scrollbar-always fast-smooth-scroll"
        >
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
