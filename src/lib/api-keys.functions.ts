import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Neturite administratoriaus teisių.");
}

export const listApiClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_clients")
      .select("id, name, key_prefix, allowed_origins, is_active, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Nepavyko įkelti API raktų.");
    return data ?? [];
  });

export const createApiClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        allowedOrigins: z.array(z.string().trim().max(200)).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateApiKey, hashApiKey } = await import("./api-auth.server");
    const { raw, prefix } = generateApiKey();
    const keyHash = await hashApiKey(raw);
    const { data: row, error } = await supabaseAdmin
      .from("api_clients")
      .insert({
        name: data.name,
        key_hash: keyHash,
        key_prefix: prefix,
        allowed_origins: data.allowedOrigins.filter(Boolean),
      })
      .select("id, name, key_prefix, allowed_origins, is_active, last_used_at, created_at")
      .single();
    if (error) throw new Error("Nepavyko sukurti API rakto.");
    return { client: row, apiKey: raw };
  });

export const setApiClientActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("api_clients")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error("Nepavyko atnaujinti API rakto.");
    return { ok: true };
  });

export const deleteApiClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_clients").delete().eq("id", data.id);
    if (error) throw new Error("Nepavyko ištrinti API rakto.");
    return { ok: true };
  });