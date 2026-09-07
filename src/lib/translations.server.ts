// Server-only: vertimų taikymas viešajame API.
// `content_translations` lentelė neturi anon skaitymo teisių, tad skaitome per
// privilegijuotą klientą — lygiai kaip daro /v1/legal. Kvietėjas tuo metu jau
// būna patvirtintas API raktu.

import { resolveDefaultLanguage } from "@/lib/languages";
import { EXTRA_SERVICE_FIELD_PREFIX, extraServiceField } from "@/lib/translations";

/** Objekto numatytoji kalba iš nustatymų (originalo kalba). */
export async function loadDefaultLanguage(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("property_settings")
    .select("default_language")
    .eq("scope", "global")
    .maybeSingle();
  return resolveDefaultLanguage((data as { default_language?: string } | null)?.default_language);
}

/** { entityId: { field: value } } vienai kalbai. */
export type EntityTranslations = Record<string, Record<string, string>>;

export async function loadTranslations(
  entityType: string,
  entityIds: string[],
  lang: string,
): Promise<EntityTranslations> {
  if (entityIds.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("content_translations")
    .select("entity_id, field, value")
    .eq("entity_type", entityType)
    .eq("lang", lang)
    .in("entity_id", entityIds);
  if (error) {
    console.error("[loadTranslations]", error.message);
    return {}; // vertimų nepavyko gauti — grąžiname originalus, o ne klaidą
  }
  const out: EntityTranslations = {};
  for (const r of (data ?? []) as Array<{ entity_id: string; field: string; value: string }>) {
    out[r.entity_id] ??= {};
    out[r.entity_id]![r.field] = r.value;
  }
  return out;
}

/** Pritaiko vertimus vienam objektui. Trūkstami laukai lieka originalo kalba. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPropertyTranslations<T extends Record<string, any>>(
  prop: T,
  tr: Record<string, string> | undefined,
): T {
  if (!tr) return prop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = { ...prop };
  if (tr["name"]?.trim()) out["name"] = tr["name"];
  if (tr["description"]?.trim()) out["description"] = tr["description"];

  if (Array.isArray(prop["extra_services"])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out["extra_services"] = prop["extra_services"].map((s: any) => {
      const t = tr[extraServiceField(String(s?.name ?? ""))];
      return t?.trim() ? { ...s, name: t } : s;
    });
  }
  return out as T;
}

/**
 * Atvirkštinis žodynas: išverstas pavadinimas -> originalus pavadinimas.
 * Būtinas kainų skaičiavimui, nes paslaugos atpažįstamos pagal originalų pavadinimą.
 */
export function buildExtraNameResolver(tr: Record<string, string> | undefined) {
  const byTranslated = new Map<string, string>();
  for (const [field, value] of Object.entries(tr ?? {})) {
    if (!field.startsWith(EXTRA_SERVICE_FIELD_PREFIX)) continue;
    const original = field.slice(EXTRA_SERVICE_FIELD_PREFIX.length);
    if (value.trim()) byTranslated.set(value.trim().toLowerCase(), original);
  }
  /** Priima ir originalų, ir išverstą pavadinimą; grąžina originalų. */
  return (incoming: string): string =>
    byTranslated.get(incoming.trim().toLowerCase()) ?? incoming;
}