import { useLocation, useParams } from "react-router";

interface ConversationIdReturn {
  conversationId: string;
}
/**
 * Gets conversationId from either the URL path or the hash in the address bar.
 * There are two ways to specify conversationId in the URL:
 *  - https://<DOMAIN_NAME>/conversations/<CONVERSATION_ID>
 *  - https://<DOMAIN_NAME>#conversationId=<CONVERSATION_ID>
 *
 * @returns {object | null} - An object with { conversationId: string } if found, otherwise null
 */
export function useConversationId(): ConversationIdReturn | null {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();

  if (!conversationId) {
    // Check if the current page is the home page (path is '/' or empty)
    const isHomePage = location.pathname === "/" || location.pathname === "";

    if (!isHomePage) {
      return null; // Do not try to extract conversationId on non-home pages
    }

    const hash = location.hash.substring(1); // Remove the leading '#' character
    const params = new URLSearchParams(hash);

    const hashConversationId = params.get("conversationId"); // Now uses "conversationId" (camelCase)
    return hashConversationId !== null
      ? { conversationId: hashConversationId }
      : null;
  }

  return { conversationId };
}
