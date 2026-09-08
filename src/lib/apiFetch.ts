import { supabase } from "./supabaseClient";

/**
 * Robust, authenticated API client for all MediChain /api/* endpoints.
 * Automatically attaches Authorization: Bearer <token> if available.
 * Does NOT inject unverified x-session-* headers.
 * Does NOT intercept third-party calls (Supabase, Gemini, external APIs).
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options: RequestInit = { ...init };
  const headers = new Headers(options.headers || {});

  // Try retrieving active Supabase session token
  let token: string | null = null;
  try {
    const sessionRes = await supabase.auth.getSession();
    token = sessionRes.data?.session?.access_token || null;
  } catch {}

  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("medichain_token");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  options.headers = headers;
  options.credentials = "include"; // Send signed cookie session for same-origin requests

  let targetUrl = input;
  const baseUrl = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "";
  if (baseUrl && typeof input === "string" && input.startsWith("/api/")) {
    targetUrl = `${baseUrl.replace(/\/$/, "")}${input}`;
  }

  const response = await fetch(targetUrl, options);

  if (response.status === 401) {
    const urlStr = typeof input === "string" ? input : (input instanceof Request ? input.url : input.toString());
    // Only dispatch auth-expired if this was an actual authenticated route, not login itself
    if (!urlStr.includes("/api/auth/login") && !urlStr.includes("/api/auth/local-login")) {
      if (typeof window !== "undefined") {
        const hadUser = localStorage.getItem("medichain_user");
        if (hadUser) {
          localStorage.removeItem("medichain_user");
          localStorage.removeItem("medichain_pharmacy");
          localStorage.removeItem("medichain_token");
          window.dispatchEvent(new Event("auth-expired"));
        }
      }
    }
  }

  return response;
}
