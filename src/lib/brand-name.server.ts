import { PLATFORM_NAME } from "@/lib/brand";

/** White-label brand name from settings; falls back to the neutral platform name. */
export async function getPublicBrandName(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("org_settings")
      .select("display_name")
      .eq("singleton", true)
      .maybeSingle();
    const name = String((data as Record<string, unknown> | null)?.["display_name"] ?? "").trim();
    return name || PLATFORM_NAME;
  } catch {
    return PLATFORM_NAME;
  }
}
