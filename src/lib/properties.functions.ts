// Shared lookups used across the admin. The short-term object CRUD was removed
// together with the nightly-rental module; unit management is built on `units`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "developer" | "owner" | "manager" | "tenant";

export type MyRole = {
  role: AppRole | null;
  isDeveloper: boolean;
  isOwner: boolean;
  isManager: boolean;
  isTenant: boolean;
  email: string;
  userId: string;
};


export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyRole> => {
    const email = String((context.claims as Record<string, unknown> | undefined)?.["email"] ?? "");
    const empty: MyRole = {
      role: null,
      isDeveloper: false,
      isOwner: false,
      isManager: false,
      isTenant: false,
      email,
      userId: context.userId,
    };

    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) {
      console.error("[getMyRole]", error.message);
      return empty;
    }
    const roles = (data ?? []).map((r) => (r as { role: AppRole }).role);
    const order: AppRole[] = ["developer", "owner", "manager", "tenant"];
    const isDeveloper = roles.includes("developer");
    const isOwner = isDeveloper || roles.includes("owner");
    const isManager = isOwner || roles.includes("manager");
    return {
      role: order.find((r) => roles.includes(r)) ?? null,
      isDeveloper,
      isOwner,
      isManager,
      isTenant: roles.includes("tenant"),
      email,
      userId: context.userId,
    };

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
