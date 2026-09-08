/**
 * Shared "what needs attention" queries.
 *
 * Both the dashboard cards (`getDashboard`) and the unit list filters
 * (`listUnits`) call these SAME helpers, so a card count and the filtered
 * list it links to can never disagree. All reads run as the signed-in user
 * (RLS applies). Availability itself is never computed here — it comes from
 * the `unit_availability` view, which calls `unit_availability_calc()`, the
 * one place the rule lives (AGENTS.md 5.7).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentPeriod } from "./rental";

type Db = SupabaseClient<any, any, any>;

export type AvailabilityRow = {
  unit_id: string;
  status: string;
  is_active: boolean;
  is_listed: boolean;
  holding_lease_id: string | null;
  holding_tenant_id: string | null;
  holding_start_date: string | null;
  holding_end_date: string | null;
  holding_renewal: boolean | null;
  holding_monthly_rent: number | null;
  has_future_lease: boolean;
  available_from: string | null;
  vacant_since: string | null;
  vacant_days: number | null;
};

export async function fetchAvailability(db: Db): Promise<AvailabilityRow[]> {
  const { data, error } = await db.from("unit_availability").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as AvailabilityRow),
    holding_monthly_rent:
      r["holding_monthly_rent"] === null ? null : Number(r["holding_monthly_rent"]),
    vacant_days: r["vacant_days"] === null ? null : Number(r["vacant_days"]),
  }));
}

export { currentPeriod };

export type MissingReadingRow = {
  meter_id: string;
  meter_type: string;
  unit_id: string | null;
  building_id: string | null;
};

/**
 * Missing readings for `period`.
 * expected = active meters on a unit that currently has a holding lease,
 *            plus active shared (building) meters
 * present  = a reading for (meter, period) with status submitted|approved
 * missing  = expected − present
 */
export async function fetchMissingReadings(
  db: Db,
  availability: AvailabilityRow[],
  period = currentPeriod(),
): Promise<{ missing: MissingReadingRow[]; expectedMeters: number; pendingReview: number }> {
  const [{ data: meters, error: mErr }, { data: readings, error: rErr }, { count: pending }] =
    await Promise.all([
      db.from("meters").select("id, type, unit_id, building_id").eq("is_active", true),
      db
        .from("meter_readings")
        .select("meter_id")
        .eq("period", period)
        .in("status", ["submitted", "approved"]),
      db
        .from("meter_readings")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
    ]);
  if (mErr) throw new Error(mErr.message);
  if (rErr) throw new Error(rErr.message);

  const occupied = new Set(
    availability.filter((a) => a.holding_lease_id !== null).map((a) => a.unit_id),
  );
  const expected = (meters ?? []).filter(
    (m: any) => m.building_id !== null || (m.unit_id && occupied.has(m.unit_id)),
  );
  const present = new Set((readings ?? []).map((r: any) => r.meter_id as string));
  const missing = expected
    .filter((m: any) => !present.has(m.id))
    .map((m: any) => ({
      meter_id: m.id as string,
      meter_type: m.type as string,
      unit_id: (m.unit_id as string | null) ?? null,
      building_id: (m.building_id as string | null) ?? null,
    }));
  return { missing, expectedMeters: expected.length, pendingReview: pending ?? 0 };
}

export type BalanceRow = { lease_id: string; unit_id: string; tenant_id: string; balance: number };

export type LeaseBalance = { charged: number; paid: number; balance: number; upcoming: number };

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * THE ONLY PLACE A BALANCE IS COMPUTED.
 *
 *   charged  = Σ charges.amount WHERE period <= today
 *   paid     = Σ payments.amount
 *   balance  = charged − paid          (rounded to cents)
 *   upcoming = Σ charges.amount WHERE period > today   (shown separately, never mixed in)
 *
 * Called with a manager client (all leases) by the dashboard/units list and with
 * a tenant's own client by the portal — RLS narrows the rows, the arithmetic is
 * identical. Do not re-implement this anywhere else.
 */
export async function computeBalances(
  db: Db,
  todayIso: string,
  opts: { leaseIds?: string[] } = {},
): Promise<Map<string, LeaseBalance>> {
  let cq = db.from("charges").select("lease_id, period, amount");
  let pq = db.from("payments").select("lease_id, amount");
  if (opts.leaseIds) {
    cq = cq.in("lease_id", opts.leaseIds);
    pq = pq.in("lease_id", opts.leaseIds);
  }
  const [{ data: charges, error: cErr }, { data: payments, error: pErr }] = await Promise.all([cq, pq]);
  if (cErr) throw new Error(cErr.message);
  if (pErr) throw new Error(pErr.message);

  const out = new Map<string, LeaseBalance>();
  const get = (id: string) => {
    let b = out.get(id);
    if (!b) {
      b = { charged: 0, paid: 0, balance: 0, upcoming: 0 };
      out.set(id, b);
    }
    return b;
  };
  for (const c of charges ?? []) {
    const b = get(c.lease_id);
    if (String(c.period).slice(0, 10) <= todayIso) b.charged += Number(c.amount);
    else b.upcoming += Number(c.amount);
  }
  for (const p of payments ?? []) get(p.lease_id).paid += Number(p.amount);
  for (const b of out.values()) {
    b.charged = cents(b.charged);
    b.paid = cents(b.paid);
    b.upcoming = cents(b.upcoming);
    b.balance = cents(b.charged - b.paid);
  }
  return out;
}

/** Debtors = leases whose `computeBalances` balance is > 0, largest first. */
export async function fetchDebtors(db: Db, todayIso: string): Promise<BalanceRow[]> {
  const [{ data: leases, error: lErr }, balances] = await Promise.all([
    db
      .from("leases")
      .select("id, unit_id, tenant_id")
      .in("status", ["active", "ending", "expired", "terminated"]),
    computeBalances(db, todayIso),
  ]);
  if (lErr) throw new Error(lErr.message);

  return (leases ?? [])
    .map((l: any) => ({
      lease_id: l.id as string,
      unit_id: l.unit_id as string,
      tenant_id: l.tenant_id as string,
      balance: balances.get(l.id)?.balance ?? 0,
    }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}
