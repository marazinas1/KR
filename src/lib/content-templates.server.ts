import type { ContentTemplateRecord } from "./content-templates";

export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) {
    console.error("[content-templates:has_role]", error.message);
    throw new Error("Nepavyko patikrinti teisių.");
  }
  if (!data) throw new Error("Neturite teisių valdyti turinio.");
}

export function rowToRecord(row: Record<string, unknown>): ContentTemplateRecord {
  return {
    id: (row["id"] as string | undefined) ?? null,
    category: row["category"] as ContentTemplateRecord["category"],
    templateName: String(row["template_name"] ?? ""),
    subject: String(row["subject"] ?? ""),
    content: String(row["content"] ?? ""),
    fields:
      row["fields"] && typeof row["fields"] === "object"
        ? (row["fields"] as Record<string, string>)
        : {},
    isEnabled: Boolean(row["is_enabled"]),
    updatedAt: (row["updated_at"] as string | undefined) ?? null,
  };
}
