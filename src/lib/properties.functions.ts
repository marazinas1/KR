// Shared lookups used across the admin. The short-term object CRUD was removed
// together with the nightly-rental module; unit management is built on `units`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "developer" | "owner" | "manager" | "tenant";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ role: AppRole | null }> => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) {
      console.error("[getMyRole]", error.message);
      return { role: null };
    }
    const roles = (data ?? []).map((r) => (r as { role: AppRole }).role);
    const order: AppRole[] = ["developer", "owner", "manager", "tenant"];
    const best = order.find((r) => roles.includes(r)) ?? null;
    return { role: best };
  });

/** Minimal unit list for pickers (expenses, settings, filters). */
export const listAllProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("units")
      .select("id, name, status, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      name: string;
      status: string;
      is_active: boolean;
      sort_order: number;
    }>;
  });
