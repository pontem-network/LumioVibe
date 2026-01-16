import { PrefetchPageLinks, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import "./home.css";
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import { HomeHeader } from "#/components/features/home/home-header/home-header";
import { TemplateGrid } from "#/components/features/home/templates";
import { AIHomeChat } from "#/components/features/home/ai-chat";
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
import { useHasMessageConversation } from "../hooks/chat/useHasMessageConversation";

// Prefetches resources for conversation pages to speed up navigation
<PrefetchPageLinks page="/conversations/:conversationId" />;

/**
 * Custom hook to handle initial conversation creation
 * if no conversationId is present in the URL.
 *
 * This hook manages the creation of a new conversation when the user
 * navigates to the home page without an existing conversation ID.
 *
 * @param conversationId - The current conversation ID from URL
 * @param createConversation - Mutation function to create new conversation
 * @param navigate - React Router navigation function
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
    // If no conversation ID is present, create a new one
    if (conversationId === null) {
      createConversation(
        {},
        {
          onSuccess: (data) => {
            // Navigate to the newly created conversation
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
 * This hook manages the visibility of project templates based on user interaction
 * in the conversation. Templates are hidden when user has started a conversation
 * and shown when the conversation is new.
 *
 * @param conversation_id - Current conversation ID
 * @param isV0Conversation - Whether the conversation uses V0 version
 * @returns Object with hasMessages, templatesVisible state and setter
 */
function useTemplatesVisibility(
  conversation_id: string | undefined,
  isV0Conversation: boolean,
) {
  const [templatesVisible, setTemplatesVisible] = useState<boolean>(true);
  const [prevHasMessages, setPrevHasMessages] = useState<boolean | null>(null);

  // Determine if there are any user messages in the conversation
  const hasMessages = useHasMessageConversation(
    conversation_id,
    isV0Conversation,
  );

  useEffect(() => {
    if (
      prevHasMessages === hasMessages ||
      prevHasMessages === true ||
      templatesVisible === false
    )
      return;

    setPrevHasMessages(prevHasMessages);
    setTemplatesVisible(!hasMessages);
  }, [hasMessages, prevHasMessages]);

  return { hasMessages, templatesVisible, setTemplatesVisible };
}

/**
 * Main home screen component that handles conversation management,
 * AI chat interface, and template display.
 *
 * This is the primary entry point for the LumioVibe application where users:
 * - Start new conversations
 * - Interact with AI assistant
 * - Access project templates
 * - Manage conversation state
 *
 * The component manages the creation of new conversations, auto-starts
 * stopped conversations, and displays the appropriate UI elements based
 * on the current state.
 */
function HomeScreen() {
  const { t } = useTranslation();
  // Extract conversation ID from URL hash (https://<DOMAIN_NAME>#conversationId=<CONVERSATION_ID>)
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

  const { hasMessages, templatesVisible, setTemplatesVisible } =
    useTemplatesVisibility(conversation?.conversation_id, isV0Conversation);

  // Show loading spinner while conversation ID is being created or not yet received
  if (conversationId === null && isCreating) {
    return (
      <div
        data-testid="home-screen-loading"
        className="home-screen__loading-container"
      >
        <div className="home-screen__loading-content">
          <Spinner />
          <p className="home-screen__loading-text">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="home-screen"
      className={`home-screen ${hasMessages ? "full_size" : "min_size"}`}
    >
      <main className="home-screen__main">
        <div className="home-screen__content-container">
          <HomeHeader />
          {/* AI chat interface for conversation with AI assistant */}
          {conversationId?.conversationId && (
            <section className="home-screen__chat-section" id="home_ai_chat">
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
            </section>
          )}
        </div>

        {/* Template grid section with toggle functionality */}
        <section className="home-screen__templates-section">
          <div className="home-screen__templates-toggle-container">
            <button
              type="button"
              className="home-screen__templates-toggle-button"
              onClick={() => setTemplatesVisible(!templatesVisible)}
              aria-label={
                templatesVisible
                  ? t("AI_CHAT$HIDE_TEMPLATE")
                  : t("AI_CHAT$SHOW_TEMPLATE")
              }
            >
              <div className="home-screen__templates-toggle-circle">
                {templatesVisible ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="home-screen__templates-toggle-arrow home-screen__templates-toggle-arrow--up"
                    aria-hidden="true"
                  >
                    <path d="M7 10L12 15L17 10" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="home-screen__templates-toggle-arrow home-screen__templates-toggle-arrow--down"
                    aria-hidden="true"
                  >
                    <path d="M7 14L12 9L17 14" />
                  </svg>
                )}
              </div>
            </button>

            {templatesVisible && (
              <div className="home-screen__templates-grid">
                <TemplateGrid showNewAppButton compact />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomeScreen;
