import { PrefetchPageLinks, useNavigate } from "react-router";
import "./home.css";
import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";
import { HomeHeader } from "#/components/features/home/home-header/home-header";
import { RecentConversations } from "#/components/features/home/recent-conversations/recent-conversations";
import { TemplateGrid } from "#/components/features/home/templates";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";
import { AIHomeChat } from "#/components/features/home/ai-chat/ai-chat";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useConversationId } from "#/hooks/use-conversation-id";
import { EventHandler } from "#/wrapper/event-handler";
import { WebSocketProviderWrapper } from "#/contexts/websocket-provider-wrapper";
import { ConversationSubscriptionsProvider } from "#/context/conversation-subscriptions-provider";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";

<PrefetchPageLinks page="/conversations/:conversationId" />;

function HomeScreen() {
  const { data: conversationsList, isPending } = usePaginatedConversations(10);

  const conversations =
    conversationsList?.pages.flatMap((page) => page.results) ?? [];
  const hasApps = conversations.length > 0;

  // Wait for initial load to determine layout
  const isInitialLoading = isPending && !conversationsList;

  // https://<DOMAIN_NAME>#conversationId=<CONVERSATION_ID>
  const conversationId = useConversationId();
  const navigate = useNavigate();
  const [hasConversationId, setHasConversationId] = useState<boolean>(false);
  const { mutate: createConversation, isPending: isCreating } =
    useCreateConversation();
  const { data: conversation } = useActiveConversation();
  const isV0Conversation = conversation?.conversation_version === "V0";

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
            setHasConversationId(true);
          },
          onError: (error) =>
            displayErrorToast(`Error creating conversation: ${error.message}`),
        },
      );
    } else {
      // If conversationId already exists, set the flag
      setHasConversationId(true);
    }
  }, [conversationId, createConversation, navigate]);

  // We are showing the spinner while the conversation_id is being created or we have not received the ID yet.
  if (conversationId === null && (isCreating || !hasConversationId)) {
    return (
      <div
        data-testid="loading-home-page"
        className="h-full flex items-center justify-center"
      >
        <div className="flex flex-col items-center">
          <Spinner />
          <p className="text-white/70 mt-2">Инициализация чата...</p>
        </div>
      </div>
    );
  }

  // Displaying templates for a project
  const renderTemplateGrid = () => {
    if (isInitialLoading) {
      return <TemplateGrid />;
    }
    if (hasApps) {
      return <TemplateGrid compact />;
    }
    return <TemplateGrid showNewAppButton />;
  };

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
          {hasConversationId && conversationId?.conversationId && (
            <div id="home_ai_chat">
              <WebSocketProviderWrapper
                version={isV0Conversation ? 0 : 1}
                conversationId={conversationId?.conversationId}
              >
                <ConversationSubscriptionsProvider>
                  <EventHandler>
                    <AIHomeChat />
                  </EventHandler>
                </ConversationSubscriptionsProvider>
              </WebSocketProviderWrapper>
            </div>
          )}

          {/* list of recent chats */}
          {!isInitialLoading && hasApps && <RecentConversations />}

          {/* templates for the project */}
          {renderTemplateGrid()}
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
