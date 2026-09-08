/** Charges, payments and charge-based invoices — manager-gated; RLS is the real boundary. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./admin-guard.server";

const periodSchema = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/);

export const previewCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ period: periodSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { previewPeriodCharges } = await import("./charges.server");
    return previewPeriodCharges(context.supabase, data.period);
  });

export const generateCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ period: periodSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { generatePeriodCharges } = await import("./charges.server");
    return generatePeriodCharges(context.supabase, data.period);
  });

export type ChargeRow = {
  id: string;
  lease_id: string;
  period: string;
  kind: string;
  meter_reading_id: string | null;
  utility_rate_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  invoice_id: string | null;
  created_at: string;
  unit_id: string;
  unit_name: string;
  tenant_name: string;
};

export const listCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        period: periodSchema.optional(),
        lease_id: z.string().uuid().optional(),
        uninvoiced: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    let q = context.supabase
      .from("charges")
      .select("*, leases:lease_id (unit_id, units:unit_id (name), tenants:tenant_id (first_name, last_name))")
      .order("period", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1000);
    if (data.period) q = q.eq("period", `${data.period.slice(0, 7)}-01`);
    if (data.lease_id) q = q.eq("lease_id", data.lease_id);
    if (data.uninvoiced) q = q.is("invoice_id", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any): ChargeRow => {
      const { leases, ...rest } = r;
      return {
        ...rest,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
        amount: Number(r.amount),
        unit_id: leases?.unit_id ?? "",
        unit_name: leases?.units?.name ?? "",
        tenant_name: `${leases?.tenants?.first_name ?? ""} ${leases?.tenants?.last_name ?? ""}`.trim(),
      };
    });
  });

export const addManualCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lease_id: z.string().uuid(),
        period: periodSchema,
        kind: z.enum(["one_off", "penalty"]),
        description: z.string().min(1).max(200),
        amount: z.number().positive().max(1_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("charges").insert({
      lease_id: data.lease_id,
      period: `${data.period.slice(0, 7)}-01`,
      kind: data.kind,
      description: data.description,
      quantity: 1,
      unit_price: data.amount,
      amount: Math.round(data.amount * 100) / 100,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Invoiced charges are immutable: refuse to delete when invoice_id is set. */
export const deleteCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: row, error: rErr } = await context.supabase
      .from("charges")
      .select("invoice_id")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("ChargeNotFound");
    if (row.invoice_id) throw new Error("ChargeInvoiced");
    const { error } = await context.supabase.from("charges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** One invoice per lease from the given uninvoiced charge ids — atomic in the DB. */
export const issueInvoiceFromCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        charge_ids: z.array(z.string().uuid()).min(1).max(200),
        issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { issueInvoiceForCharges } = await import("./invoices.server");
    return issueInvoiceForCharges(context.supabase, {
      chargeIds: data.charge_ids,
      issueDate: data.issue_date,
      notes: data.notes,
    });
  });

/**
 * Default flow: one invoice per (lease, period) for every uninvoiced charge of
 * that period. Each lease is its own atomic DB call; the result lists per-lease
 * outcomes so a failure on one lease never hides the others.
 */
export const issueInvoicesForPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ period: periodSchema, issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const period = `${data.period.slice(0, 7)}-01`;
    const { data: rows, error } = await context.supabase
      .from("charges")
      .select("id, lease_id")
      .eq("period", period)
      .is("invoice_id", null);
    if (error) throw new Error(error.message);
    const byLease = new Map<string, string[]>();
    for (const r of rows ?? []) byLease.set(r.lease_id, [...(byLease.get(r.lease_id) ?? []), r.id]);
    const { issueInvoiceForCharges } = await import("./invoices.server");
    const results: Array<{ lease_id: string; full_number?: string; error?: string }> = [];
    for (const [leaseId, ids] of byLease) {
      try {
        const inv = await issueInvoiceForCharges(context.supabase, { chargeIds: ids, issueDate: data.issue_date });
        results.push({ lease_id: leaseId, full_number: inv.full_number });
      } catch (e) {
        results.push({ lease_id: leaseId, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { issued: results.filter((r) => r.full_number).length, failed: results.filter((r) => r.error).length, results };
  });

// ---------------- payments ----------------

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lease_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    let q = context.supabase
      .from("payments")
      .select("*, leases:lease_id (unit_id, units:unit_id (name), tenants:tenant_id (first_name, last_name))")
      .order("paid_at", { ascending: false })
      .limit(500);
    if (data.lease_id) q = q.eq("lease_id", data.lease_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => {
      const { leases, ...rest } = r;
      return {
        ...rest,
        amount: Number(r.amount),
        unit_name: leases?.units?.name ?? "",
        tenant_name: `${leases?.tenants?.first_name ?? ""} ${leases?.tenants?.last_name ?? ""}`.trim(),
      } as {
        id: string; lease_id: string; paid_at: string; amount: number; method: string;
        reference: string; note: string; unit_name: string; tenant_name: string;
      };
    });
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lease_id: z.string().uuid(),
        paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.number().positive().max(1_000_000),
        method: z.enum(["bank", "cash", "other"]).default("bank"),
        reference: z.string().max(100).default(""),
        note: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("payments").insert({
      ...data,
      amount: Math.round(data.amount * 100) / 100,
      recorded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lease balances for admin screens — the shared computeBalances(). */
export const getLeaseBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lease_ids: z.array(z.string().uuid()).max(500).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { computeBalances } = await import("./dashboard-queries.server");
    const { todayIso } = await import("./rental");
    const m = await computeBalances(context.supabase, todayIso(), { leaseIds: data.lease_ids });
    return Object.fromEntries(m);
  });
