import { PrefetchPageLinks, useNavigate } from "react-router";
import "./home.css";
import React, { useEffect, useMemo } from "react";
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

// Prefetches resources for conversation pages to speed up navigation
<PrefetchPageLinks page="/conversations/:conversationId" />;

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
  useEffect(() => {
    // If conversationId is not present (null), create a new conversation
    if (conversationId === null) {
      createConversation(
        {},
        {
          onSuccess: (data) => {
            // Add conversation_id to the URL as a hash
            navigate(`#conversationId=${data.conversation_id}`);
          },
          onError: (error) =>
            displayErrorToast(`Error creating conversation: ${error.message}`),
        },
      );
    }
  }, [conversationId, createConversation, navigate]);

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

          <TemplateGrid showNewAppButton compact />
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
