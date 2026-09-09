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
      .from("org_settings")
      .select("*")
      .eq("singleton", true)
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
      singleton: true,
      updated_by: context.userId,
    };

    const { data: row, error } = await context.supabase
      .from("org_settings")
      .upsert(patch as never, { onConflict: "singleton" })
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

/** Public (unauthenticated) branding for the sign-in screen. */
export const getPublicBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ displayName: string; tagline: string; logoUrl: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("org_settings")
      .select("display_name, tagline, brand_logo_url")
      .eq("singleton", true)
      .maybeSingle();
    if (error) {
      console.error("[getPublicBranding]", error.message);
      return { displayName: "", tagline: "", logoUrl: "" };
    }
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      displayName: String(row["display_name"] ?? ""),
      tagline: String(row["tagline"] ?? ""),
      logoUrl: String(row["brand_logo_url"] ?? ""),
    };
  },
);
