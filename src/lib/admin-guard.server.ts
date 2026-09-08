/** Role guards shared by the admin server functions. RLS is the real boundary;
 *  these only turn a policy failure into a clean error message. */
import type { SupabaseClient } from "@supabase/supabase-js";

type Ctx = { supabase: SupabaseClient<any, any, any>; userId: string };

async function hasRole(ctx: Ctx, role: "manager" | "owner" | "developer" | "tenant") {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: role,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function requireManager(ctx: Ctx) {
  if (!(await hasRole(ctx, "manager"))) throw new Error("Forbidden");
}

export async function requireOwner(ctx: Ctx) {
  if (!(await hasRole(ctx, "owner"))) throw new Error("Forbidden");
}

export async function isOwner(ctx: Ctx) {
  return hasRole(ctx, "owner");
}

/** Tenant portal guard. The real boundary is RLS via current_tenant_id(). */
export async function requireTenant(ctx: Ctx) {
  if (!(await hasRole(ctx, "tenant"))) throw new Error("Forbidden");
}
