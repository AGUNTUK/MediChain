import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClientInstance) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // In production, missing or mock credentials must be a hard fatal error to prevent silent data loss (I1)
    if (process.env.NODE_ENV === "production") {
      if (!supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes("mock-project-id") || supabaseServiceRoleKey.includes("mock-")) {
        console.error("FATAL: Supabase Admin credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are missing or set to mock values in production! Exiting to prevent silent data loss.");
        process.exit(1);
      }
    }

    const isMissingOrMock = !supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes("mock-project-id") || supabaseServiceRoleKey.includes("mock-");

    if (isMissingOrMock) {
      // In development / test environment, return a fail-safe client proxy that reports explicit errors
      // rather than hanging on DNS timeouts or reporting silent success with `error: null`
      const mockQueryBuilder: any = new Proxy({}, {
        get(_t, method) {
          if (method === "then") {
            return (resolve: any) => resolve({ data: null, error: new Error("Supabase offline: local mock credentials active"), count: 0 });
          }
          return () => mockQueryBuilder;
        }
      });

      return new Proxy({} as SupabaseClient, {
        get(_t, prop) {
          if (prop === "from") return () => mockQueryBuilder;
          if (prop === "auth") return {
            admin: mockQueryBuilder,
            getUser: async (_token: string) => ({ data: { user: null }, error: new Error("Supabase auth offline: local mock credentials active") })
          };
          if (prop === "rpc") return () => Promise.resolve({ data: null, error: new Error("Supabase RPC offline: local mock credentials active") });
          if (prop === "storage") return { from: () => mockQueryBuilder };
          return () => mockQueryBuilder;
        }
      });
    }

    adminClientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClientInstance;
}

// Proxy wrapper for `supabaseAdmin` export so existing imports (`import { supabaseAdmin } from ...`)
// continue to work seamlessly, lazily initializing upon property access / API call execution.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
