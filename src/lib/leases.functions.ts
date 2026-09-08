/**
 * Lease (nuomos sutartis) lifecycle.
 *
 * Two distinct actions, deliberately kept apart:
 *
 * 1. `setLeaseNotice` — the tenant announces a FUTURE move-out. This is only
 *    `renewal = false` + `end_date` on the still-running lease. The lease stays
 *    active/ending and the unit stays `occupied`, because `units.status` is a
 *    stored column: nothing would flip it on a future date without a scheduled
 *    job, and there is none. `public_vacancies` computes the date live, so the
 *    public site already shows the exact availability date.
 *
 * 2. `terminateLease` — the lease ends NOW (effective date today or in the
 *    past). Status becomes `terminated` and the unit becomes `vacant`
 *    immediately, because everything happens at the moment of the action.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager, requireOwner } from "./admin-guard.server";
import { HOLDING_LEASE_STATUSES, todayIso } from "./rental";

function mapError(message: string): string {
  if (message.includes("leases_no_overlap")) return "LeaseOverlap";
  return message;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export type LeaseRow = {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  deposit_paid: number;
  payment_day: number;
  notice_days: number;
  status: string;
  renewal: boolean;
  terminated_at: string | null;
  termination_reason: string;
  notes: string;
  tenant_name: string;
  unit_name: string;
};

const LEASE_COLUMNS =
  "id, unit_id, tenant_id, start_date, end_date, monthly_rent, deposit, deposit_paid, payment_day, notice_days, status, renewal, terminated_at, termination_reason, notes";

async function decorate(
  context: { supabase: any },
  rows: Array<Record<string, unknown>>,
): Promise<LeaseRow[]> {
  const [{ data: tenants }, { data: units }] = await Promise.all([
    context.supabase.from("tenants").select("id, first_name, last_name"),
    context.supabase.from("units").select("id, name"),
  ]);
  const tName = new Map(
    (tenants ?? []).map((t: any) => [t.id, `${t.first_name} ${t.last_name}`.trim()]),
  );
  const uName = new Map((units ?? []).map((u: any) => [u.id, u.name]));
  return rows.map((r) => ({
    ...(r as LeaseRow),
    tenant_name: String(tName.get(r["tenant_id"] as string) ?? ""),
    unit_name: String(uName.get(r["unit_id"] as string) ?? ""),
  }));
}

export const listLeases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unit_id: z.string().uuid().optional(),
        tenant_id: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<LeaseRow[]> => {
    await requireManager(context);
    let q = context.supabase.from("leases").select(LEASE_COLUMNS);
    if (data.unit_id) q = q.eq("unit_id", data.unit_id);
    if (data.tenant_id) q = q.eq("tenant_id", data.tenant_id);
    const { data: rows, error } = await q.order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return decorate(context, (rows ?? []) as never);
  });

export const listLeaseOccupants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lease_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: rows, error } = await context.supabase
      .from("lease_occupants")
      .select("id, lease_id, tenant_id, full_name, phone, email, relation")
      .eq("lease_id", data.lease_id)
      .order("full_name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addLeaseOccupant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lease_id: z.string().uuid(),
        full_name: z.string().min(1).max(120),
        phone: z.string().max(40).default(""),
        email: z.string().max(160).default(""),
        relation: z.string().max(60).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("lease_occupants").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeLeaseOccupant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("lease_occupants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sets the unit status to match the lease that currently holds it. */
async function syncUnitStatus(context: { supabase: any }, unitId: string) {
  const today = todayIso();
  const { data: leases } = await context.supabase
    .from("leases")
    .select("status, start_date, end_date")
    .eq("unit_id", unitId);
  const held = (leases ?? []).some(
    (l: any) =>
      HOLDING_LEASE_STATUSES.includes(l.status) &&
      l.start_date <= today &&
      (!l.end_date || l.end_date >= today),
  );
  const { data: unit } = await context.supabase
    .from("units")
    .select("status")
    .eq("id", unitId)
    .maybeSingle();
  // Never override a manual renovation/inactive state.
  if (unit && (unit.status === "renovation" || unit.status === "inactive")) return;
  await context.supabase
    .from("units")
    .update({ status: held ? "occupied" : "vacant" })
    .eq("id", unitId);
}

export const createLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unit_id: z.string().uuid(),
        tenant_id: z.string().uuid(),
        start_date: z.string().min(10),
        end_date: z.string().nullable().optional(),
        monthly_rent: z.number().min(0),
        deposit: z.number().min(0).default(0),
        deposit_paid: z.number().min(0).default(0),
        payment_day: z.number().int().min(1).max(28).default(1),
        notice_days: z.number().int().min(0).max(365).default(30),
        renewal: z.boolean().default(true),
        status: z.enum(["draft", "active"]).default("active"),
        notes: z.string().max(4000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const row = { ...data, end_date: data.end_date || null };
    const { data: created, error } = await context.supabase
      .from("leases")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(mapError(error.message));
    if (data.status === "active") {
      await syncUnitStatus(context, data.unit_id);
      await context.supabase.from("unit_events").insert({
        unit_id: data.unit_id,
        kind: "occupied",
        started_at: new Date(`${data.start_date}T00:00:00Z`).toISOString(),
        note: "",
      });
    }
    return { id: created.id as string };
  });

export const updateLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        start_date: z.string().min(10).optional(),
        end_date: z.string().nullable().optional(),
        monthly_rent: z.number().min(0).optional(),
        deposit: z.number().min(0).optional(),
        deposit_paid: z.number().min(0).optional(),
        payment_day: z.number().int().min(1).max(28).optional(),
        notice_days: z.number().int().min(0).max(365).optional(),
        status: z.enum(["draft", "active", "ending", "expired"]).optional(),
        notes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, ...patch } = data;
    if ("end_date" in patch) patch.end_date = patch.end_date || null;
    const { data: row, error } = await context.supabase
      .from("leases")
      .update(patch)
      .eq("id", id)
      .select("unit_id")
      .single();
    if (error) throw new Error(mapError(error.message));
    await syncUnitStatus(context, row.unit_id as string);
    return { ok: true };
  });

/**
 * Notice of a future move-out — the `renewal` + `end_date` pair that drives both
 * the dashboard warnings and the public vacancy list. The unit is NOT freed here.
 */
export const setLeaseNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        renewal: z.boolean(),
        end_date: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const endDate = data.end_date || null;
    if (!data.renewal && !endDate) throw new Error("EndDateRequired");
    const { error } = await context.supabase
      .from("leases")
      .update({
        renewal: data.renewal,
        end_date: endDate,
        status: data.renewal ? "active" : "ending",
      })
      .eq("id", data.id);
    if (error) throw new Error(mapError(error.message));
    return { ok: true };
  });

/**
 * Renewal = a new contract. The running lease is closed on its end date and a
 * new lease row starts the next day, so the history stays intact.
 */
export const renewLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        new_end_date: z.string().nullable().optional(),
        monthly_rent: z.number().min(0),
        deposit: z.number().min(0).optional(),
        payment_day: z.number().int().min(1).max(28).optional(),
        notice_days: z.number().int().min(0).max(365).optional(),
        notes: z.string().max(4000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: old, error: readErr } = await context.supabase
      .from("leases")
      .select(LEASE_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!old) throw new Error("NotFound");
    const closeOn = (old.end_date as string | null) ?? todayIso();

    const { error: closeErr } = await context.supabase
      .from("leases")
      .update({ status: "expired", end_date: closeOn, renewal: true })
      .eq("id", data.id);
    if (closeErr) throw new Error(mapError(closeErr.message));

    const { data: created, error } = await context.supabase
      .from("leases")
      .insert({
        unit_id: old.unit_id,
        tenant_id: old.tenant_id,
        start_date: addDays(closeOn, 1),
        end_date: data.new_end_date || null,
        monthly_rent: data.monthly_rent,
        deposit: data.deposit ?? old.deposit,
        deposit_paid: old.deposit_paid,
        payment_day: data.payment_day ?? old.payment_day,
        notice_days: data.notice_days ?? old.notice_days,
        status: "active",
        renewal: true,
        notes: data.notes,
      })
      .select("id")
      .single();
    if (error) {
      // Roll the old lease back so a failed renewal leaves nothing half-done.
      await context.supabase
        .from("leases")
        .update({ status: old.status, end_date: old.end_date })
        .eq("id", data.id);
      throw new Error(mapError(error.message));
    }
    await syncUnitStatus(context, old.unit_id as string);
    return { id: created.id as string };
  });

/**
 * Immediate or backdated termination only — the effective date may not be in
 * the future (see the file header for why).
 */
export const terminateLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        effective_date: z.string().min(10),
        reason: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    if (data.effective_date > todayIso()) throw new Error("FutureTerminationNotAllowed");
    const { data: row, error } = await context.supabase
      .from("leases")
      .update({
        status: "terminated",
        end_date: data.effective_date,
        terminated_at: new Date().toISOString(),
        termination_reason: data.reason,
        renewal: false,
      })
      .eq("id", data.id)
      .select("unit_id")
      .single();
    if (error) throw new Error(mapError(error.message));
    await syncUnitStatus(context, row.unit_id as string);
    await context.supabase.from("unit_events").insert({
      unit_id: row.unit_id,
      kind: "vacated",
      started_at: new Date(`${data.effective_date}T00:00:00Z`).toISOString(),
      note: data.reason,
    });
    return { ok: true };
  });

export const deleteLease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { data: row } = await context.supabase
      .from("leases")
      .select("unit_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("leases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.unit_id) await syncUnitStatus(context, row.unit_id as string);
    return { ok: true };
  });
