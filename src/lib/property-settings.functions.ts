import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { settingsSchemas, type SettingsSectionId } from "./property-settings";
import { rowToSettings } from "./property-settings-map";
import { assertSettingsAdmin, sectionToColumns } from "./property-settings.server";

export const getPropertySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row, error } = await context.supabase
      .from("property_settings")
      .select("*")
      .eq("scope", "global")
      .maybeSingle();
    if (error) {
      console.error("[getPropertySettings]", error.message);
      throw new Error("Nepavyko įkelti nustatymų.");
    }
    return {
      exists: Boolean(row),
      updatedAt: (row?.updated_at as string | undefined) ?? null,
      settings: rowToSettings(row as Record<string, unknown> | null),
    };
  });

export const savePropertySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const sectionIds = Object.keys(settingsSchemas) as [SettingsSectionId, ...SettingsSectionId[]];
    const base = z
      .object({
        section: z.enum(sectionIds),
        values: z.record(z.unknown()),
      })
      .parse(d);
    const parsedValues = settingsSchemas[base.section].parse(base.values);
    return { ...base, values: parsedValues as Record<string, unknown> };
  })
  .handler(async ({ data, context }) => {
    await assertSettingsAdmin({ supabase: context.supabase, userId: context.userId });

    const patch = {
      ...sectionToColumns(data.values),
      scope: "global",
      updated_by: context.userId,
    };

    const { data: row, error } = await context.supabase
      .from("property_settings")
      .upsert(patch as never, { onConflict: "scope" })
      .select("*")
      .single();

    if (error) {
      console.error("[savePropertySettings]", error.message);
      throw new Error("Nepavyko išsaugoti nustatymų.");
    }
    return {
      updatedAt: (row?.updated_at as string | undefined) ?? null,
      settings: rowToSettings(row as Record<string, unknown>),
    };
  });
/** Vieša (be autentifikacijos) prekės ženklo informacija prisijungimo puslapiui. */
export const getPublicBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ displayName: string; logoUrl: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("property_settings")
      .select("display_name, brand_logo_url")
      .eq("scope", "global")
      .maybeSingle();
    if (error) {
      console.error("[getPublicBranding]", error.message);
      return { displayName: "", logoUrl: "" };
    }
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      displayName: String(row["display_name"] ?? ""),
      logoUrl: String(row["brand_logo_url"] ?? ""),
    };
  },
);
