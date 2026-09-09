import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { buildLeaseContract } from "./contracts.server";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "manager",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

export const getActiveContractTemplatePublic = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        language: z.enum(["lt", "en"]).default("lt"),
        kind: z.string().default("rental"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("contract_templates")
      .select("id, name, content, language, kind, updated_at")
      .eq("language", data.language)
      .eq("kind", data.kind)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listContractTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("contract_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(200),
        content: z.string().max(200000).default(""),
        language: z.enum(["lt", "en"]).default("lt"),
        kind: z.enum(["rental", "privacy", "lease"]).default("rental"),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("contract_templates")
        .update(data)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("contract_templates").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("contract_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
/** Lease contracts (step 9): fill an active `lease` template with real lease data. */
export const previewLeaseContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ lease_id: z.string().uuid(), template_id: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: tpl, error } = await context.supabase
      .from("contract_templates")
      .select("id, name, content, kind")
      .eq("id", data.template_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tpl) throw new Error("TemplateNotFound");
    if (tpl.kind !== "lease") throw new Error("NotALeaseTemplate");
    const filled = await buildLeaseContract(context, data.lease_id, tpl.content ?? "");
    return { ...filled, template_name: tpl.name };
  });

export const listLeaseTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("contract_templates")
      .select("id, name, language, is_active")
      .eq("kind", "lease")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
