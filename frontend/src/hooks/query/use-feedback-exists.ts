import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useConfig } from "#/hooks/query/use-config";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { BatchFeedbackData, getFeedbackQueryKey } from "./use-batch-feedback";

export type FeedbackData = BatchFeedbackData;

export const useFeedbackExists = (eventId?: number) => {
  const queryClient = useQueryClient();
  const conversationId: string | null =
    useConversationId()?.conversationId ?? null;
  if (conversationId === null) {
    throw new Error("conversationId is null");
  }
  const { data: config } = useConfig();
  const conversation = useActiveConversation()?.data;

  const isV1Conversation = conversation?.conversation_version === "V1";

  return useQuery<FeedbackData>({
    queryKey: [...getFeedbackQueryKey(conversationId), eventId],
    queryFn: () => {
      if (!eventId) return { exists: false };

      // Try to get the data from the batch cache
      const batchData = queryClient.getQueryData<
        Record<string, BatchFeedbackData>
      >(getFeedbackQueryKey(conversationId));

      return batchData?.[eventId.toString()] ?? { exists: false };
    },
    enabled:
      !!eventId &&
      !!conversationId &&
      config?.APP_MODE === "saas" &&
      !isV1Conversation,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};
