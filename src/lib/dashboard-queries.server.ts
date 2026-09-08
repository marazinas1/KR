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

/**
 * Balance per lease = Σ charges (period ≤ today) − Σ payments.
 * Same arithmetic as the tenant portal's `getMyBalance` (charged − paid).
 * Only leases with a positive balance are returned (debtors).
 */
export async function fetchDebtors(db: Db, todayIso: string): Promise<BalanceRow[]> {
  const [{ data: leases, error: lErr }, { data: charges, error: cErr }, { data: payments, error: pErr }] =
    await Promise.all([
      db
        .from("leases")
        .select("id, unit_id, tenant_id")
        .in("status", ["active", "ending", "expired", "terminated"]),
      db.from("charges").select("lease_id, amount").lte("period", todayIso),
      db.from("payments").select("lease_id, amount"),
    ]);
  if (lErr) throw new Error(lErr.message);
  if (cErr) throw new Error(cErr.message);
  if (pErr) throw new Error(pErr.message);

  const bal = new Map<string, number>();
  for (const c of charges ?? []) bal.set(c.lease_id, (bal.get(c.lease_id) ?? 0) + Number(c.amount));
  for (const p of payments ?? []) bal.set(p.lease_id, (bal.get(p.lease_id) ?? 0) - Number(p.amount));

  return (leases ?? [])
    .map((l: any) => ({
      lease_id: l.id as string,
      unit_id: l.unit_id as string,
      tenant_id: l.tenant_id as string,
      balance: Math.round((bal.get(l.id) ?? 0) * 100) / 100,
    }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}
