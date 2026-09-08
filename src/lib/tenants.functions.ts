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

    // v1 PORTAL LIMITATION (deliberate, do not rediscover): the tenant portal
    // is scoped by the PRIMARY tenant on a lease (leases.tenant_id) — see the
    // DB functions tenant_owns_lease()/tenant_owns_unit() and their COMMENTs.
    // A person who only appears in lease_occupants would get a login but an
    // empty portal, so the invite action is only offered when this tenant is
    // (or has been) the primary tenant on at least one lease.
    const { count } = await context.supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", data.id);
    const canInvite = (await isOwner(context)) && (count ?? 0) > 0;

    return { tenant, identity, canSeeIdentity, canInvite, documents: documents ?? [] };
  });

/**
 * Creates (or re-sends) a portal login for a tenant and links tenants.user_id.
 * Owner-only (user management). See the v1 limitation comment in getTenant.
 */
export const inviteTenantToPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ tenant_id: z.string().uuid(), redirectTo: z.string().url().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { data: tenant, error } = await context.supabase
      .from("tenants")
      .select("id, first_name, last_name, email, user_id")
      .eq("id", data.tenant_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenant) throw new Error("NotFound");
    if (!tenant.email) throw new Error("NoEmail");

    const { count } = await context.supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);
    if ((count ?? 0) === 0) throw new Error("NotPrimaryTenant");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { appLink } = await import("@/lib/app-url.server");
    const fullName = `${tenant.first_name} ${tenant.last_name}`.trim();
    const opts = { redirectTo: appLink("/reset-password", data.redirectTo), data: { full_name: fullName } };
    let link = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email: tenant.email, options: opts });
    if (link.error && /registered|exists/i.test(link.error.message)) {
      link = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: tenant.email, options: opts });
    }
    if (link.error) throw new Error(link.error.message);
    const userId = link.data.user?.id;
    const actionLink = link.data.properties?.action_link;
    if (!userId) throw new Error("Nepavyko sukurti vartotojo.");

    // A login may belong to exactly one tenant record.
    const { data: clash } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("user_id", userId)
      .neq("id", tenant.id)
      .maybeSingle();
    if (clash) throw new Error("EmailUsedByOtherTenant");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "tenant" } as never, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);
    const { error: linkErr } = await supabaseAdmin
      .from("tenants")
      .update({ user_id: userId })
      .eq("id", tenant.id);
    if (linkErr) throw new Error(linkErr.message);

    if (actionLink) {
      const { sendEmail } = await import("@/lib/notifications.server");
      const { getPublicBrandName } = await import("@/lib/brand-name.server");
      const brandName = await getPublicBrandName();
      await sendEmail({
        to: tenant.email,
        subject: `Nuomininko savitarna — ${brandName}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Sveiki, ${fullName},</p>
            <p>Jums sukurta nuomininko savitarnos paskyra (${brandName}). Joje galėsite pateikti skaitliukų rodmenis, pranešti apie gedimus ir matyti savo sutartį.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Susikurti slaptažodį</a></p>
            <p style="font-size:13px;color:#666">Jei mygtukas neveikia, nukopijuokite šią nuorodą:<br>${actionLink}</p>
          </div>
        `,
      });
    }
    return { ok: true, emailed: Boolean(actionLink) };
  });

/** Removes portal access: unlinks the login, drops the tenant role, deletes the auth user. */
export const revokeTenantPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { data: tenant } = await context.supabase
      .from("tenants")
      .select("id, user_id")
      .eq("id", data.tenant_id)
      .maybeSingle();
    if (!tenant?.user_id) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Never delete a login that also holds a staff role.
    const { data: staffRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", tenant.user_id)
      .neq("role", "tenant" as never)
      .maybeSingle();
    if (staffRole) throw new Error("UserHasStaffRole");
    await supabaseAdmin.from("tenants").update({ user_id: null }).eq("id", tenant.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", tenant.user_id);
    await supabaseAdmin.auth.admin.deleteUser(tenant.user_id);
    return { ok: true };
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
