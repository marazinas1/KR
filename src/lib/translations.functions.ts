import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { isAllowedField } from "@/lib/translations";
import type { TranslationMap } from "@/lib/translations";

const entityTypes = ["property", "content_template", "property_settings"] as const;
const langCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

export const getTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entityType: z.enum(entityTypes),
        entityId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<TranslationMap> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("content_translations")
      .select("field, lang, value")
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId);
    if (error) throw new Error(error.message);

    const out: TranslationMap = {};
    for (const r of (rows ?? []) as Array<{ field: string; lang: string; value: string }>) {
      out[r.field] ??= {};
      out[r.field]![r.lang] = r.value;
    }
    return out;
  });

export const saveTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entityType: z.enum(entityTypes),
        entityId: z.string().uuid(),
        lang: z.enum(langCodes),
        // { field: value }; tuščia reikšmė = vertimo nėra (įrašas ištrinamas)
        values: z.record(z.string().max(20000)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    // Apsauga nuo klaidingų raktų.
    const invalid = Object.keys(data.values).filter(
      (f) => !isAllowedField(data.entityType, f),
    );
    if (invalid.length > 0) {
      throw new Error(`Neleistini vertimo laukai: ${invalid.join(", ")}`);
    }

    const entries = Object.entries(data.values);
    const toUpsert = entries
      .filter(([, value]) => value.trim() !== "")
      .map(([field, value]) => ({
        entity_type: data.entityType,
        entity_id: data.entityId,
        field,
        lang: data.lang,
        value,
        updated_by: context.userId,
      }));
    const toDelete = entries.filter(([, value]) => value.trim() === "").map(([field]) => field);

    if (toUpsert.length > 0) {
      const { error } = await context.supabase
        .from("content_translations")
        .upsert(toUpsert as never, { onConflict: "entity_type,entity_id,field,lang" });
      if (error) throw new Error(error.message);
    }

    // Ištuštintas laukas reiškia „vertimo nėra" — įrašą šaliname.
    if (toDelete.length > 0) {
      const { error } = await context.supabase
        .from("content_translations")
        .delete()
        .eq("entity_type", data.entityType)
        .eq("entity_id", data.entityId)
        .eq("lang", data.lang)
        .in("field", toDelete);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });
