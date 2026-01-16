import { useMemo } from "react";
import { shouldRenderEvent as shouldRenderV0Event } from "#/components/features/chat/event-content-helpers/should-render-event";
import { useEventStore } from "#/stores/use-event-store";
import { isActionOrObservation, isOpenHandsAction } from "#/types/core/guards";
import { isV0Event, isV1Event } from "#/types/v1/type-guards";

/**
 * Custom hook to determine if there are user messages in the conversation
 *
 * This hook checks the event store for any user-generated messages in both
 * V0 and V1 conversation formats. It returns null when no conversation ID
 * is provided, indicating the state is not yet initialized.
 *
 * @param conversationId - The ID of the conversation to check
 * @param isV0Conversation - Flag indicating if this is a V0 format conversation
 * @returns boolean | null - True if user messages exist, false if none, null if not initialized
 */
export function useHasMessageConversation(
  conversationId: string | undefined,
  isV0Conversation: boolean,
): boolean | null {
  const storeEvents = useEventStore((state) => state.events);

  // Determine if there are any user messages in the conversation
  return useMemo(() => {
    // Return null if no conversation ID
    if (!conversationId) return null;

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
  }, [storeEvents, conversationId, isV0Conversation]);
}
