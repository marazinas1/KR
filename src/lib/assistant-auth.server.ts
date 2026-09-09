/**
 * Server-only: bearer-token auth for the assistant API route.
 *
 * Same idea as `requireSupabaseAuth`, but works on a raw Request. The client
 * it returns runs as the signed-in user, so RLS still applies to everything
 * the assistant reads. Access is admin-level only: developer, owner, manager.
 * Tenants are rejected.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AssistantAuth = {
  supabase: SupabaseClient<Database>;
  userId: string;
  role: "developer" | "owner" | "manager";
};

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

export async function authenticateAdminRequest(request: Request): Promise<AssistantAuth | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewKey(key) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  // `manager` is the lowest admin level; has_role() is hierarchical in this
  // project, so a developer/owner also passes the manager check.
  const { data: isManager } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "manager",
  });
  if (!isManager) return null;

  const [{ data: isDeveloper }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "developer" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);

  return {
    supabase,
    userId,
    role: isDeveloper ? "developer" : isOwner ? "owner" : "manager",
  };
}
