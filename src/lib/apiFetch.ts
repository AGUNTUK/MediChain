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

/**
 * Safely parses JSON response from API. If the server returned an HTML error document,
 * or plain-text Vercel gateway error (e.g. FUNCTION_INVOCATION_FAILED, 500, 502, 504),
 * provides a structured, user-friendly error rather than crashing with
 * SyntaxError: Unexpected token 'A' / '<' ... is not valid JSON.
 */
export async function safeJsonResponse<T = any>(response: Response): Promise<{ ok: boolean; data: T | null; error?: string; fields?: Record<string, string> }> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
      return { ok: response.ok, data: null };
    }
    const trimmed = text.trim();

    // Check if response is HTML or non-JSON plain text (e.g. Vercel error banners)
    const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<");
    const isNonJson = !trimmed.startsWith("{") && !trimmed.startsWith("[");

    if (isHtml || isNonJson) {
      if (!response.ok) {
        let errorMsg = "সার্ভার থেকে অপ্রত্যাশিত রেসপন্স এসেছে বা সংযোগ সাময়িকভাবে অনুপলব্ধ রয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
        if (response.status === 401 || response.status === 403) {
          errorMsg = "আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।";
        } else if (response.status === 404) {
          errorMsg = "অনুরোধকৃত রিসোর্সটি পাওয়া যায়নি।";
        }
        return {
          ok: false,
          data: null,
          error: errorMsg
        };
      }
      return {
        ok: true,
        data: trimmed as any
      };
    }

    try {
      const data = JSON.parse(text) as T;
      return {
        ok: response.ok,
        data,
        error: !response.ok ? ((data as any)?.error || "অনুরোধটি সফল হয়নি।") : undefined,
        fields: (data as any)?.fields
      };
    } catch {
      return {
        ok: false,
        data: null,
        error: !response.ok 
          ? "সার্ভার থেকে অপ্রত্যাশিত রেসপন্স এসেছে বা সংযোগ সাময়িকভাবে অনুপলব্ধ রয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "সার্ভার থেকে সঠিক ফরম্যাটে তথ্য পাওয়া যায়নি।"
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: "সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।"
    };
  }
}
