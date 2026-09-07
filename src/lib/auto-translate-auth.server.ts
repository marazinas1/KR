// Server-only: administratoriaus patikra automatinio vertimo funkcijoms.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertTranslateAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}
