import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;

function getAuthPayload() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("medichain_user") : null;
    if (!raw) return {};
    const u = JSON.parse(raw);
    return {
      userId: u?.id || null,
      role: u?.role || null,
      pharmacyId: u?.pharmacy_id || null
    };
  } catch {
    return {};
  }
}

/**
 * MediChain Resilient Socket.io Factory
 * 
 * Provides a reliable WebSocket connection to the Node.js backend.
 * Automatically handles Vercel hosting vs local development, limits
 * reconnection attempts, enforces websocket-first transport to prevent
 * polling storms, and passes authenticated session context for room authorization.
 */
export function getSocketClient(): Socket {
  if (sharedSocket && sharedSocket.connected) {
    return sharedSocket;
  }

  // If running on Vercel preview or production domain, target Render backend
  const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
  const targetUrl = isVercel
    ? "https://medichain-kqgy.onrender.com"
    : (typeof window !== "undefined" ? window.location.origin : "");

  sharedSocket = io(targetUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    timeout: 10000,
    autoConnect: true,
    auth: getAuthPayload()
  });

  return sharedSocket;
}
