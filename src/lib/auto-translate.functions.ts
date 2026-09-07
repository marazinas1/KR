import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { isAllowedField } from "@/lib/translations";

const entityTypes = ["property", "content_template", "property_settings"] as const;
const langCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

/** Vieno įrašo (objekto ar šablono) laukų vertimas — grąžina rezultatą peržiūrai. */
export const autoTranslateFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entityType: z.enum(entityTypes),
        fromLang: z.enum(langCodes),
        toLang: z.enum(langCodes),
        items: z
          .array(
            z.object({
              field: z.string().min(1).max(200),
              text: z.string().max(20000),
              html: z.boolean().optional(),
            }),
          )
          .max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<Record<string, string>> => {
    const { assertTranslateAdmin } = await import("@/lib/auto-translate-auth.server");
    await assertTranslateAdmin(context);

    const items = data.items.filter(
      (i) => i.text.trim() !== "" && isAllowedField(data.entityType, i.field),
    );
    if (items.length === 0) return {};

    const { translateFields } = await import("@/lib/auto-translate.server");
    return await translateFields(items, data.fromLang, data.toLang);
  });

export type BulkTranslateResult = {
  translated: number;
  skipped: number;
  failed: number;
  entities: number;
  errors: string[];
};

/** Masinis vertimas: visi objektai + visi turinio šablonai. */
export const autoTranslateAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        toLang: z.enum(langCodes),
        overwrite: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<BulkTranslateResult> => {
    const { assertTranslateAdmin } = await import("@/lib/auto-translate-auth.server");
    await assertTranslateAdmin(context);

    const { runBulkTranslate } = await import("@/lib/auto-translate-bulk.server");
    return await runBulkTranslate({
      supabase: context.supabase,
      userId: context.userId,
      toLang: data.toLang,
      overwrite: data.overwrite,
    });
  });
