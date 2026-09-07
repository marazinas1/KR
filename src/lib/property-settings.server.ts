import { SETTINGS_COLUMN_MAP, type PropertySettings } from "./property-settings";

export function sectionToColumns(values: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const column = SETTINGS_COLUMN_MAP[key as keyof PropertySettings];
    if (!column) continue;
    patch[column] =
      value === "" && key !== "cancellationPolicyText" && key !== "invoiceNotes" ? null : value;
  }
  return patch;
}

export async function assertSettingsAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) {
    console.error("[property-settings:has_role]", error.message);
    throw new Error("Nepavyko patikrinti teisių.");
  }
  if (!data) throw new Error("Neturite teisių keisti nustatymų.");
}
