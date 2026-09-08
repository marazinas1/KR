/**
 * Tenant portal (/nuomininkas) server functions.
 *
 * Scope rules:
 * - Every call runs as the signed-in tenant through their own Supabase client,
 *   so RLS (current_tenant_id / tenant_owns_unit / tenant_owns_building) is the
 *   real boundary. Nothing here widens it.
 * - The client never supplies a unit_id or lease_id for scoping. The active
 *   lease is resolved server-side from the tenant's own record.
 * - v1 DECISION: portal scope is the PRIMARY tenant on a lease
 *   (leases.tenant_id). lease_occupants do not get portal access; see the
 *   COMMENT on tenant_owns_lease() in the database and the invite action in
 *   tenants.functions.ts. Do not rediscover this.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "./admin-guard.server";
import { HOLDING_LEASE_STATUSES, ISSUE_CATEGORIES, currentPeriod } from "./rental";

type Ctx = { supabase: any; userId: string };

export type MyLease = {
  tenant: { id: string; first_name: string; last_name: string };
  lease: {
    id: string;
    start_date: string;
    end_date: string | null;
    monthly_rent: number;
    deposit: number;
    payment_day: number;
    notice_days: number;
    status: string;
    renewal: boolean;
  } | null;
  unit: {
    id: string;
    name: string;
    unit_number: string;
    floor: number | null;
    area_m2: number | null;
    room_count: number;
    address: string;
    city: string;
    building_id: string | null;
    building_name: string | null;
  } | null;
};

/** Resolves the tenant record and the lease currently held (active/ending). */
async function resolveMine(ctx: Ctx): Promise<MyLease> {
  const { data: tenant, error } = await ctx.supabase
    .from("tenants")
    .select("id, first_name, last_name")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tenant) return { tenant: { id: "", first_name: "", last_name: "" }, lease: null, unit: null };

  const { data: lease } = await ctx.supabase
    .from("leases")
    .select(
      "id, unit_id, start_date, end_date, monthly_rent, deposit, payment_day, notice_days, status, renewal",
    )
    .eq("tenant_id", tenant.id)
    .in("status", HOLDING_LEASE_STATUSES)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lease) return { tenant, lease: null, unit: null };

  const { data: unit } = await ctx.supabase
    .from("units")
    .select("id, name, unit_number, floor, area_m2, room_count, address, city, building_id")
    .eq("id", lease.unit_id)
    .maybeSingle();
  let building_name: string | null = null;
  if (unit?.building_id) {
    const { data: b } = await ctx.supabase
      .from("buildings")
      .select("name")
      .eq("id", unit.building_id)
      .maybeSingle();
    building_name = b?.name ?? null;
  }
  const { unit_id: _u, ...leaseRow } = lease;
  return {
    tenant,
    lease: { ...leaseRow, monthly_rent: Number(lease.monthly_rent), deposit: Number(lease.deposit) },
    unit: unit ? { ...unit, building_name } : null,
  };
}

export const getMyLease = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyLease> => {
    await requireTenant(context);
    return resolveMine(context);
  });

export type MyMeter = {
  id: string;
  type: string;
  serial_number: string;
  uom: string;
  shared: boolean;
  initial_reading: number;
  last_approved: { period: string; value: number } | null;
  current: { id: string; value: number; status: string; period: string; photo_path: string } | null;
};

export { currentPeriod };

/**
 * Meters the tenant may read AND submit for: the unit's own meters plus the
 * shared meters of the unit's building. RLS returns exactly this set, so the
 * list and the submit check below share one scope.
 */
async function myMeterIds(ctx: Ctx): Promise<string[]> {
  const { data, error } = await ctx.supabase.from("meters").select("id").eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m: { id: string }) => m.id);
}

export const getMyMeters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ period: string; meters: MyMeter[] }> => {
    await requireTenant(context);
    const period = currentPeriod();
    // RLS already limits this to own unit + own building shared meters.
    const { data: meters, error } = await context.supabase
      .from("meters")
      .select("id, unit_id, building_id, type, serial_number, uom, initial_reading")
      .eq("is_active", true)
      .order("type");
    if (error) throw new Error(error.message);
    const ids = (meters ?? []).map((m: { id: string }) => m.id);
    const { data: readings } = ids.length
      ? await context.supabase
          .from("meter_readings")
          .select("id, meter_id, period, value, status, photo_path")
          .in("meter_id", ids)
          .order("period", { ascending: false })
      : { data: [] };
    const rows = (readings ?? []) as Array<{
      id: string;
      meter_id: string;
      period: string;
      value: number;
      status: string;
      photo_path: string;
    }>;
    return {
      period,
      meters: (meters ?? []).map((m: any) => {
        const mine = rows.filter((r) => r.meter_id === m.id);
        const approved = mine.find((r) => r.status === "approved");
        const cur = mine.find((r) => r.period === period && r.status !== "rejected");
        return {
          id: m.id,
          type: m.type,
          serial_number: m.serial_number,
          uom: m.uom,
          shared: m.unit_id === null,
          initial_reading: Number(m.initial_reading),
          last_approved: approved ? { period: approved.period, value: Number(approved.value) } : null,
          current: cur
            ? { id: cur.id, value: Number(cur.value), status: cur.status, period: cur.period, photo_path: cur.photo_path }
            : null,
        };
      }),
    };
  });

export const submitMyReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        meter_id: z.string().uuid(),
        value: z.number().min(0),
        photo_path: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireTenant(context);
    // Same scope as getMyMeters: own unit meters + own building shared meters.
    // (RLS enforces this again on insert; this only gives a clean message.)
    const allowed = await myMeterIds(context);
    if (!allowed.includes(data.meter_id)) throw new Error("Forbidden");
    const { error } = await context.supabase.from("meter_readings").insert({
      meter_id: data.meter_id,
      period: currentPeriod(),
      value: data.value,
      photo_path: data.photo_path,
      status: "submitted",
      submitted_by: context.userId,
    });
    if (error) {
      if (/mazesn|mažesn|lower|previous|initial/i.test(error.message)) throw new Error("ReadingTooLow");
      if (/duplicate|unique/i.test(error.message)) throw new Error("ReadingExists");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const signMyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ path: z.string().min(1), bucket: z.enum(["meter-photos", "issue-photos", "documents"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireTenant(context);
    // Storage RLS limits signing to the tenant's own folders.
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl as string };
  });

const ISSUE_COLUMNS = "id, category, title, description, priority, status, photo_paths, resolved_at, created_at";

export const listMyIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTenant(context);
    const { data, error } = await context.supabase
      .from("issues")
      .select(ISSUE_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      priority: string;
      status: string;
      photo_paths: string[];
      resolved_at: string | null;
      created_at: string;
    }>;
  });

export const getMyIssue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireTenant(context);
    const { data: issue, error } = await context.supabase
      .from("issues")
      .select(ISSUE_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!issue) throw new Error("NotFound");
    const { data: comments } = await context.supabase
      .from("issue_comments")
      .select("id, author_role, body, created_at")
      .eq("issue_id", data.id)
      .order("created_at");
    return { issue, comments: comments ?? [] };
  });

export const createMyIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        category: z.enum(ISSUE_CATEGORIES),
        title: z.string().min(1).max(160),
        description: z.string().max(4000).default(""),
        photo_paths: z.array(z.string().max(500)).max(5).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireTenant(context);
    const mine = await resolveMine(context);
    if (!mine.lease || !mine.unit) throw new Error("NoLease");
    const { data: created, error } = await context.supabase
      .from("issues")
      .insert({
        unit_id: mine.unit.id,
        lease_id: mine.lease.id,
        reported_by: context.userId,
        reporter_name: `${mine.tenant.first_name} ${mine.tenant.last_name}`.trim(),
        category: data.category,
        title: data.title,
        description: data.description,
        photo_paths: data.photo_paths,
        priority: "normal",
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const addMyIssueComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ issue_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireTenant(context);
    const { error } = await context.supabase.from("issue_comments").insert({
      issue_id: data.issue_id,
      body: data.body,
      author_id: context.userId,
      author_role: "tenant",
      is_internal: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTenant(context);
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, kind, title, file_path, bucket, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      kind: string;
      title: string;
      file_path: string;
      bucket: string;
      expires_at: string | null;
      created_at: string;
    }>;
  });

export const getMyBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTenant(context);
    const { computeBalances } = await import("./dashboard-queries.server");
    const { todayIso } = await import("./rental");
    const today = todayIso();
    // RLS narrows charges/payments to this tenant's own lease(s); the arithmetic
    // is the shared computeBalances() — identical to the admin debtor card.
    const [balances, { data: charges }, { data: payments }] = await Promise.all([
      computeBalances(context.supabase, today),
      context.supabase
        .from("charges")
        .select("id, period, kind, description, amount, invoice_id")
        .order("period", { ascending: false }),
      context.supabase
        .from("payments")
        .select("id, paid_at, amount, method")
        .order("paid_at", { ascending: false }),
    ]);
    const c = (charges ?? []) as Array<{ id: string; period: string; kind: string; description: string; amount: number; invoice_id: string | null }>;
    const p = (payments ?? []) as Array<{ id: string; paid_at: string; amount: number; method: string }>;
    let charged = 0, paid = 0, balance = 0, upcoming = 0;
    for (const b of balances.values()) {
      charged += b.charged; paid += b.paid; balance += b.balance; upcoming += b.upcoming;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
      charged: r2(charged),
      paid: r2(paid),
      balance: r2(balance),
      upcoming: r2(upcoming),
      charges: c.slice(0, 24).map((r) => ({ ...r, amount: Number(r.amount), upcoming: r.period.slice(0, 10) > today })),
      payments: p.slice(0, 12).map((r) => ({ ...r, amount: Number(r.amount) })),
    };
  });
