// Server-only: masinis visų objektų ir turinio šablonų vertimas.
import { PROPERTY_TRANSLATABLE_FIELDS, extraServiceField } from "@/lib/translations";
import { loadDefaultLanguage } from "@/lib/translations.server";
import { translateFields, type TranslateItem } from "@/lib/auto-translate.server";
import type { BulkTranslateResult } from "@/lib/auto-translate.functions";

type Ctx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  toLang: string;
  overwrite: boolean;
};

type Job = { entityType: "property" | "content_template"; entityId: string; items: TranslateItem[] };

export async function runBulkTranslate(ctx: Ctx): Promise<BulkTranslateResult> {
  const fromLang = await loadDefaultLanguage();
  const result: BulkTranslateResult = {
    translated: 0,
    skipped: 0,
    failed: 0,
    entities: 0,
    errors: [],
  };
  if (fromLang === ctx.toLang) return result;

  const { data: existingRows } = await ctx.supabase
    .from("content_translations")
    .select("entity_type, entity_id, field, value")
    .eq("lang", ctx.toLang);
  const existing = new Set<string>(
    ((existingRows ?? []) as Array<{
      entity_type: string;
      entity_id: string;
      field: string;
      value: string;
    }>)
      .filter((r) => (r.value ?? "").trim() !== "")
      .map((r) => `${r.entity_type}|${r.entity_id}|${r.field}`),
  );

  const jobs: Job[] = [];

  // --- Objektai -------------------------------------------------------------
  const { data: props, error: propErr } = await ctx.supabase
    .from("properties")
    .select("id, name, description, location_note, rooms, extra_services");
  if (propErr) result.errors.push(`properties: ${propErr.message}`);

  for (const p of (props ?? []) as Array<Record<string, any>>) {
    const originals: Record<string, string> = {
      name: String(p["name"] ?? ""),
      description: String(p["description"] ?? ""),
      location_note: String(p["location_note"] ?? ""),
      rooms_notes: String(p["rooms"]?.notes ?? ""),
    };
    const services = Array.isArray(p["extra_services"]) ? p["extra_services"] : [];
    for (const s of services) {
      const nm = String(s?.name ?? "").trim();
      if (nm) originals[extraServiceField(nm)] = nm;
    }
    const items: TranslateItem[] = [];
    for (const [field, text] of Object.entries(originals)) {
      if (!text.trim()) continue;
      const key = `property|${p["id"]}|${field}`;
      if (!ctx.overwrite && existing.has(key)) {
        result.skipped++;
        continue;
      }
      const def = PROPERTY_TRANSLATABLE_FIELDS.find((f) => f.field === field);
      items.push({ field, text, html: Boolean(def?.html) });
    }
    if (items.length > 0) jobs.push({ entityType: "property", entityId: String(p["id"]), items });
  }

  // --- Turinio šablonai -----------------------------------------------------
  const { data: templates, error: tplErr } = await ctx.supabase
    .from("content_templates")
    .select("id, subject, content");
  if (tplErr) result.errors.push(`content_templates: ${tplErr.message}`);

  for (const tpl of (templates ?? []) as Array<Record<string, any>>) {
    const items: TranslateItem[] = [];
    const originals: Array<[string, string, boolean]> = [
      ["subject", String(tpl["subject"] ?? ""), false],
      ["content", String(tpl["content"] ?? ""), true],
    ];
    for (const [field, text, html] of originals) {
      if (!text.trim()) continue;
      const key = `content_template|${tpl["id"]}|${field}`;
      if (!ctx.overwrite && existing.has(key)) {
        result.skipped++;
        continue;
      }
      items.push({ field, text, html });
    }
    if (items.length > 0)
      jobs.push({ entityType: "content_template", entityId: String(tpl["id"]), items });
  }

  // --- Vertimas (nuosekliai, kad neviršytume AI limitų) ----------------------
  for (const job of jobs) {
    try {
      const out = await translateFields(job.items, fromLang, ctx.toLang);
      const rows = Object.entries(out)
        .filter(([, v]) => v.trim() !== "")
        .map(([field, value]) => ({
          entity_type: job.entityType,
          entity_id: job.entityId,
          field,
          lang: ctx.toLang,
          value,
          updated_by: ctx.userId,
        }));
      if (rows.length > 0) {
        const { error } = await ctx.supabase
          .from("content_translations")
          .upsert(rows, { onConflict: "entity_type,entity_id,field,lang" });
        if (error) throw new Error(error.message);
      }
      result.translated += rows.length;
      result.failed += job.items.length - rows.length;
      result.entities++;
    } catch (e) {
      result.failed += job.items.length;
      const msg = e instanceof Error ? e.message : String(e);
      if (result.errors.length < 5) result.errors.push(msg);
    }
  }

  return result;
}
