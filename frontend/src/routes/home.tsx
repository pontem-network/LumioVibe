import { PrefetchPageLinks, useNavigate } from "react-router";
import "./home.css";
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import { HomeHeader } from "#/components/features/home/home-header/home-header";
import { TemplateGrid } from "#/components/features/home/templates";
import { AIHomeChat } from "#/components/features/home/ai-chat/ai-chat";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import {
  ConversationIdReturn,
  useConversationId,
} from "#/hooks/use-conversation-id";
import { EventHandler } from "#/wrapper/event-handler";
import { WebSocketProviderWrapper } from "#/contexts/websocket-provider-wrapper";
import { ConversationSubscriptionsProvider } from "#/context/conversation-subscriptions-provider";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useUserProviders } from "#/hooks/use-user-providers";
import { useAutoStartConversation } from "#/hooks/use-auto-start-conversation";
import { useEventStore } from "#/stores/use-event-store";
import { isV0Event, isV1Event } from "#/types/v1/type-guards";
import { isOpenHandsAction, isActionOrObservation } from "#/types/core/guards";
import { shouldRenderEvent as shouldRenderV0Event } from "#/components/features/chat/event-content-helpers/should-render-event";

// Prefetches resources for conversation pages to speed up navigation
<PrefetchPageLinks page="/conversations/:conversationId" />;

/**
 * Custom hook to handle initial conversation creation
 * if no conversationId is present in the URL.
 */
function useInitializeConversation(
  conversationId: ConversationIdReturn | null,
  createConversation: typeof useCreateConversation extends () => {
    mutate: infer T;
  }
    ? T
    : never,
  navigate: ReturnType<typeof useNavigate>,
) {
  useEffect(() => {
    if (conversationId === null) {
      createConversation(
        {},
        {
          onSuccess: (data) => {
            navigate(`#conversationId=${data.conversation_id}`);
          },
          onError: (error) =>
            displayErrorToast(`Error creating conversation: ${error.message}`),
        },
      );
    }
  }, [conversationId, createConversation, navigate]);
}

/**
 * Custom hook to determine if there are user messages in the conversation
 * and manage template visibility accordingly.
 *
 * @param conversation - Current conversation object
 * @param isV0Conversation - Whether the conversation uses V0 version
 * @returns {{ hasMessages: boolean | null; templatesVisible: boolean; setTemplatesVisible: React.Dispatch<React.SetStateAction<boolean>> }}
 */
function useTemplatesVisibilityWithMessages(
  conversation_id: string | undefined,
  isV0Conversation: boolean,
) {
  const storeEvents = useEventStore((state) => state.events);

  // Determine if there are any user messages
  const hasMessages = useMemo(() => {
    if (!conversation_id) return null;

    if (isV0Conversation) {
      const v0Events = storeEvents
        .filter(isV0Event)
        .filter(isActionOrObservation)
        .filter(shouldRenderV0Event);

      return v0Events.some(
        (event) => isOpenHandsAction(event) && event.source === "user",
      );
    }

    const v1Events = storeEvents.filter(isV1Event);
    return v1Events.some((event) => event.source === "user");
  }, [storeEvents, conversation_id, isV0Conversation]);

  // Manage template visibility based on message state
  const [templatesVisible, setTemplatesVisible] = useState(true);
  const [prevHasMessages, setPrevHasMessages] = useState<boolean | null>(null);

  useEffect(() => {
    if (prevHasMessages === null && hasMessages !== null) {
      setTemplatesVisible(!hasMessages);
      setPrevHasMessages(hasMessages);
    } else if (
      (prevHasMessages === false || prevHasMessages === null) &&
      hasMessages === true
    ) {
      setTemplatesVisible(false);
      setPrevHasMessages(hasMessages);
    } else if (
      prevHasMessages === true &&
      (hasMessages === false || hasMessages === null)
    ) {
      setTemplatesVisible(true);
      setPrevHasMessages(hasMessages);
    }
  }, [hasMessages, prevHasMessages]);

  return { hasMessages, templatesVisible, setTemplatesVisible };
}

/**
 * Main home screen component that handles conversation management,
 * AI chat interface, and template display.
 *
 * This component manages the creation of new conversations, auto-starts
 * stopped conversations, and displays the appropriate UI elements based
 * on the current state.
 */
function HomeScreen() {
  // https://<DOMAIN_NAME>#conversationId=<CONVERSATION_ID>
  const conversationId: ConversationIdReturn | null = useConversationId();
  const navigate = useNavigate();
  const { mutate: createConversation, isPending: isCreating } =
    useCreateConversation();
  const conversation = useActiveConversation()?.data;
  const isV0Conversation = conversation?.conversation_version === "V0";
  const { providers: userProviders } = useUserProviders();

  // Memoize providers to prevent unnecessary re-renders
  const providers = useMemo(() => userProviders, [userProviders]);

  // Handle auto-starting stopped conversations
  useAutoStartConversation(providers);

  // Check if conversationId exists, and create a new one if needed
  useInitializeConversation(conversationId, createConversation, navigate);

  const { templatesVisible, setTemplatesVisible } =
    useTemplatesVisibilityWithMessages(
      conversation?.conversation_id,
      isV0Conversation,
    );

  // We are showing the spinner while the conversationId is being created or we have not received the ID yet.
  if (conversationId === null && isCreating) {
    return (
      <div
        data-testid="loading-home-page"
        className="h-full flex items-center justify-center"
      >
        <div className="flex flex-col items-center">
          <Spinner />
          <p className="text-white/70 mt-2">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="home-screen"
      className="px-0 pt-4 bg-transparent h-full flex flex-col pt-[35px] overflow-y-auto rounded-xl lg:px-[42px] lg:pt-[42px] custom-scrollbar-always"
    >
      <HomeHeader />

      <div className="pt-[25px] flex justify-center">
        <div
          id="new_conversation_section"
          className="flex flex-col gap-6 px-6 w-full lg:px-0 lg:max-w-[1000px]"
          data-testid="home-screen-new-conversation-section"
        >
          {/* An input field for communicating with AI */}
          {conversationId?.conversationId && (
            <div id="home_ai_chat">
              <WebSocketProviderWrapper
                version={isV0Conversation ? 0 : 1}
                conversationId={conversationId.conversationId}
              >
                <ConversationSubscriptionsProvider>
                  <EventHandler>
                    <AIHomeChat />
                  </EventHandler>
                </ConversationSubscriptionsProvider>
              </WebSocketProviderWrapper>
            </div>
          )}

          <div className="template-toggle-container">
            <div
              className="template-toggle-button"
              onClick={() => setTemplatesVisible(!templatesVisible)}
            >
              <div className="toggle-circle">
                {templatesVisible ? (
                  <svg viewBox="0 0 24 24" className="up-arrow">
                    <path d="M7 10L12 15L17 10" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="down-arrow">
                    <path d="M7 14L12 9L17 14" />
                  </svg>
                )}
              </div>
            </div>
            {templatesVisible && <TemplateGrid showNewAppButton compact />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
