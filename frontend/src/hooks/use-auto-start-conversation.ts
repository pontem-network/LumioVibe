import { useEffect, useRef } from "react";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useUnifiedResumeConversationSandbox } from "#/hooks/mutation/use-unified-start-conversation";
import { useAuthWallet } from "#/hooks/use-auth";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { Provider } from "#/types/settings";

/**
 * Custom hook to handle auto-starting stopped conversations
 *
 * This hook automatically starts conversations that are in STOPPED status
 * when the component mounts, but only if they haven't been processed yet.
 *
 * @param providers - User providers object to pass to the start conversation mutation
 */
export const useAutoStartConversation = (providers: Provider[]) => {
  const conversation = useActiveConversation()?.data;
  const isAuthed = useAuthWallet().connected;
  const { mutate: startConversation, isPending: isStarting } =
    useUnifiedResumeConversationSandbox();

  // Track which conversation ID we've auto-started to prevent auto-restart after manual stop
  const processedConversationId = useRef<string | null>(null);

  // Auto-start effect - handles auto-starting STOPPED conversations
  useEffect(() => {
    // Wait for data to be fetched
    if (!conversation || !isAuthed) return;

    const currentConversationId = conversation.conversation_id;
    const currentStatus = conversation.status;

    // Skip if we've already processed this conversation
    if (processedConversationId.current === currentConversationId) {
      return;
    }

    // Mark as processed immediately to prevent duplicate calls
    processedConversationId.current = currentConversationId;

    // Auto-start STOPPED conversations on initial load only
    if (currentStatus === "STOPPED" && !isStarting) {
      startConversation(
        { conversationId: currentConversationId, providers },
        {
          onError: (error) => {
            displayErrorToast(`Failed to start conversation: ${error.message}`);
          },
        },
      );
    }
  }, [conversation, isAuthed, isStarting, providers, startConversation]);

  return { isStarting };
};
