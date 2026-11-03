import { createClient } from "@supabase/supabase-js";

/**
 * Lazy-initialized Supabase Client for MediChain
 * 
 * Safely accesses client-side public environment variables with hardcoded
 * fallback to active project MediChain-Prod-2 (okwiohbwvvveecyhxawh) to ensure
 * cold starts and Vercel builds never hang on suspended project domains.
 */

const FALLBACK_SUPABASE_URL = "https://okwiohbwvvveecyhxawh.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rd2lvaGJ3dnZ2ZWVjeWh4YXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1MzI5NjcsImV4cCI6MjEwOTEwODk2N30.xNteFfLwCg7k5nnV8lDQ6lf4S46WCMhsmG4Lj9c1Bks";

const getEnvVar = (key: string): string | undefined => {
  if (typeof window !== "undefined") {
    return (import.meta as any).env?.[key];
  }
  return (import.meta as any).env?.[key] || (typeof process !== "undefined" ? process.env?.[key] : undefined);
};

let rawUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL") || getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
let rawAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");

function isKeyForTargetProject(key: string | undefined, targetProjectRef = "okwiohbwvvveecyhxawh"): boolean {
  if (!key || typeof key !== "string") return false;
  try {
    const parts = key.split(".");
    if (parts.length === 3) {
      let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const jsonStr = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
      const payload = JSON.parse(jsonStr);
      return payload.ref === targetProjectRef;
    }
  } catch {}
  return false;
}

// Purge any reference to suspended legacy project qboghbbrqfmexpbzvded
if (!rawUrl || rawUrl.includes("qboghbbrqfmexpbzvded")) {
  rawUrl = FALLBACK_SUPABASE_URL;
}
if (!rawAnonKey || !isKeyForTargetProject(rawAnonKey, "okwiohbwvvveecyhxawh")) {
  rawAnonKey = FALLBACK_SUPABASE_ANON_KEY;
}

export const supabaseUrl = rawUrl || FALLBACK_SUPABASE_URL;
export const supabaseAnonKey = rawAnonKey || FALLBACK_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseClientInstance: any = null;

export function getSupabaseClient() {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseClientInstance;
}

export const supabase = getSupabaseClient();
