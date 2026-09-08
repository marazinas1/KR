/** Tenant (nuomininkas) records. A tenant is plain data — a portal login is optional. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwner, requireManager, requireOwner } from "./admin-guard.server";
import { HOLDING_LEASE_STATUSES, todayIso } from "./rental";

export type TenantListRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  has_login: boolean;
  unit_name: string | null;
  unit_id: string | null;
};

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TenantListRow[]> => {
    await requireManager(context);
    const [{ data: tenants, error }, { data: leases }, { data: units }] = await Promise.all([
      context.supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, email, is_active, user_id")
        .order("last_name")
        .order("first_name"),
      context.supabase.from("leases").select("unit_id, tenant_id, status, start_date, end_date"),
      context.supabase.from("units").select("id, name"),
    ]);
    if (error) throw new Error(error.message);
    const today = todayIso();
    const unitName = new Map((units ?? []).map((u) => [u.id, u.name]));
    return (tenants ?? []).map((t) => {
      const lease = (leases ?? []).find(
        (l) =>
          l.tenant_id === t.id &&
          HOLDING_LEASE_STATUSES.includes(l.status as never) &&
          l.start_date <= today &&
          (!l.end_date || l.end_date >= today),
      );
      return {
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        phone: t.phone,
        email: t.email,
        is_active: t.is_active,
        has_login: Boolean(t.user_id),
        unit_id: lease?.unit_id ?? null,
        unit_name: lease?.unit_id ? (unitName.get(lease.unit_id) ?? null) : null,
      };
    });
  });

export const getTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: tenant, error } = await context.supabase
      .from("tenants")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenant) throw new Error("NotFound");

    // Personal identification data is owner/developer only — the manager never
    // receives it, it is not filtered away in the browser.
    const canSeeIdentity = await isOwner(context);
    type Identity = {
      tenant_id: string;
      personal_code: string;
      id_doc_type: string;
      id_doc_number: string;
      issued_by: string;
      valid_until: string | null;
    };
    let identity: Identity | null = null;
    if (canSeeIdentity) {
      const { data: row } = await context.supabase
        .from("tenant_identity")
        .select("tenant_id, personal_code, id_doc_type, id_doc_number, issued_by, valid_until")
        .eq("tenant_id", data.id)
        .maybeSingle();
      identity = row ?? null;
    }

    const { data: documents } = await context.supabase
      .from("documents")
      .select("id, kind, title, file_path, bucket, expires_at, created_at")
      .eq("tenant_id", data.id)
      .order("created_at", { ascending: false });

    return { tenant, identity, canSeeIdentity, documents: documents ?? [] };
  });

export const saveTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        first_name: z.string().min(1).max(80),
        last_name: z.string().min(1).max(80),
        phone: z.string().max(40).default(""),
        email: z.string().max(160).default(""),
        notes: z.string().max(4000).default(""),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, ...row } = data;
    if (id) {
      const { error } = await context.supabase.from("tenants").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("tenants")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const saveTenantIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        personal_code: z.string().max(40).default(""),
        id_doc_type: z.string().max(40).default(""),
        id_doc_number: z.string().max(40).default(""),
        issued_by: z.string().max(120).default(""),
        valid_until: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { error } = await context.supabase
      .from("tenant_identity")
      .upsert({ ...data, valid_until: data.valid_until || null }, { onConflict: "tenant_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { error } = await context.supabase.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
