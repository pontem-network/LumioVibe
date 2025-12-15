/**
 * Check if proxy mode is enabled
 * In proxy mode, runtime requests go to hostname/runtime/{port} instead of hostname:{port}
 */
const isProxyMode = (): boolean =>
  import.meta.env.VITE_PROXY_MODE === "true";

/**
 * Extracts port from a URL
 * @param url The URL to extract port from
 * @returns The port number or null if not found
 */
function extractPort(url: URL): string | null {
  if (url.port) {
    return url.port;
  }
  // Default ports
  if (url.protocol === "https:") return "443";
  if (url.protocol === "http:") return "80";
  return null;
}

/**
 * Extracts the base host from conversation URL
 * @param conversationUrl The conversation URL containing host/port (e.g., "http://localhost:3000/api/conversations/123")
 * @returns Base host (e.g., "localhost:3000") or window.location.host as fallback
 */
export function extractBaseHost(
  conversationUrl: string | null | undefined,
): string {
  if (conversationUrl && !conversationUrl.startsWith("/")) {
    try {
      const url = new URL(conversationUrl);
      return url.host; // e.g., "localhost:3000"
    } catch {
      return window.location.host;
    }
  }
  return window.location.host;
}

/**
 * Builds the HTTP base URL for V1 API calls
 * In proxy mode: returns hostname/runtime/{port} (e.g., "https://example.com/runtime/3000")
 * In normal mode: returns hostname:{port} (e.g., "http://localhost:3000")
 * @param conversationUrl The conversation URL containing host/port
 * @returns HTTP base URL
 */
export function buildHttpBaseUrl(
  conversationUrl: string | null | undefined,
): string {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";

  if (isProxyMode()) {
    // In proxy mode, use current window host and route through /runtime/{port}
    if (conversationUrl && !conversationUrl.startsWith("/")) {
      try {
        const url = new URL(conversationUrl);
        const port = extractPort(url);
        if (port) {
          return `${protocol}//${window.location.host}/runtime/${port}`;
        }
      } catch {
        // Fall through to default
      }
    }
    return `${protocol}//${window.location.host}`;
  }

  // Normal mode: use the full host:port from conversation URL
  const baseHost = extractBaseHost(conversationUrl);
  return `${protocol}//${baseHost}`;
}

/**
 * Builds the WebSocket URL for V1 conversations (without query params)
 * In proxy mode: returns hostname/runtime/{port}/sockets/events/{conversationId}
 * In normal mode: returns hostname:{port}/sockets/events/{conversationId}
 * @param conversationId The conversation ID
 * @param conversationUrl The conversation URL containing host/port (e.g., "http://localhost:3000/api/conversations/123")
 * @returns WebSocket URL or null if inputs are invalid
 */
export function buildWebSocketUrl(
  conversationId: string | undefined,
  conversationUrl: string | null | undefined,
): string | null {
  if (!conversationId) {
    return null;
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  if (isProxyMode()) {
    // In proxy mode, use current window host and route through /runtime/{port}
    if (conversationUrl && !conversationUrl.startsWith("/")) {
      try {
        const url = new URL(conversationUrl);
        const port = extractPort(url);
        if (port) {
          return `${wsProtocol}//${window.location.host}/runtime/${port}/sockets/events/${conversationId}`;
        }
      } catch {
        // Fall through to default
      }
    }
    return `${wsProtocol}//${window.location.host}/sockets/events/${conversationId}`;
  }

  // Normal mode: use the full host:port from conversation URL
  const baseHost = extractBaseHost(conversationUrl);
  return `${wsProtocol}//${baseHost}/sockets/events/${conversationId}`;
}
