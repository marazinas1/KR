type Ctx = { supabase: any; userId: string };

async function fetchRoles(ctx: Ctx): Promise<string[]> {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => String(r.role));
}

/** Manager-level access: developer, owner, manager. */
export async function assertManager(ctx: Ctx) {
  const roles = await fetchRoles(ctx);
  const ok = ["developer", "owner", "manager"].some((r) => roles.includes(r));
  if (!ok) throw new Error("Neturite administratoriaus teisių.");
}

/** Owner-level access: developer or owner only (settings, user management). */
export async function assertOwner(ctx: Ctx) {
  const roles = await fetchRoles(ctx);
  const ok = roles.includes("developer") || roles.includes("owner");
  if (!ok) throw new Error("Šiam veiksmui reikia savininko teisių.");
}

export async function isDeveloper(ctx: Ctx) {
  return (await fetchRoles(ctx)).includes("developer");
}
