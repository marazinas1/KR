/**
 * Charge generation — THE ONE PLACE the billing formula lives.
 *
 *   utility: amount = round(consumption × rate.price_per_unit, 2)
 *            rate   = latest utility_rates row with effective_from <= period (per type)
 *   fixed:   one row per (lease, period, rate) when rate.fixed_monthly > 0
 *   rent:    monthly_rent, pro-rated by days when the lease starts/ends inside the month
 *
 * ROUNDING: every money product is rounded by Postgres `round_money_products()`
 * in `numeric` (half away from zero). Raw DB strings ("0.2345", "150.000") are
 * sent as-is, so 0.2345 × 150 = 35.175 → 35.18, not the float artefact 35.17.
 * JS never multiplies money; it only splits already-rounded cents (integers).
 *
 * Shared (building) meters: the reading's cost is split equally across the
 * leases holding units in that building during the period (largest-remainder,
 * so the per-lease cents always sum to the full cost).
 *
 * The rate's fixed_monthly fee for a shared meter is split the SAME way — it is
 * one subscription fee per meter, not per tenant, so three leases on one
 * building water meter pay 0.50 + 0.50 + 0.50 of a 1.50 fee, not 1.50 each.
 * A lease whose OWN unit meter uses the same rate pays the full fee.
 *
 * A reading with no effective tariff is reported as a BLOCKED line — nothing is
 * written for it, never a zero-amount substitute.
 *
 * Writes rely on the partial unique indexes on `charges` (see migration):
 * a unique_violation (23505) is counted as `skipped`, so re-running a period
 * is idempotent by construction.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<any, any, any>;

export type ChargeKind = "rent" | "utility" | "fixed" | "one_off" | "penalty";

export type PreviewLine = {
  lease_id: string;
  unit_id: string;
  period: string;
  kind: ChargeKind;
  meter_reading_id: string | null;
  utility_rate_id: string | null;
  meter_type: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

export type BlockedLine = {
  reason: "no_rate" | "no_lease" | "no_building_leases";
  meter_type: string;
  meter_reading_id: string;
  unit_id: string | null;
  building_id: string | null;
  period: string;
};

export type ChargePreview = {
  period: string;
  lines: PreviewLine[];
  blocked: BlockedLine[];
  total: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function normalizePeriod(period: string): string {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(period)) throw new Error("InvalidPeriod");
  return `${period.slice(0, 7)}-01`;
}

function monthBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${period.slice(0, 7)}-${String(daysInMonth).padStart(2, "0")}`;
  return { start: period, end, daysInMonth };
}

function dayDiffInclusive(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Exported for the pro-rating verification. */
export function rentForPeriod(
  monthlyRent: number,
  leaseStart: string,
  leaseEnd: string | null,
  period: string,
): { amount: number; coveredFrom: string; coveredTo: string; days: number; daysInMonth: number } {
  const { start, end, daysInMonth } = monthBounds(period);
  const coveredFrom = leaseStart > start ? leaseStart : start;
  const coveredTo = leaseEnd && leaseEnd < end ? leaseEnd : end;
  const days = Math.max(0, dayDiffInclusive(coveredFrom, coveredTo));
  const amount = days >= daysInMonth ? r2(monthlyRent) : r2((monthlyRent * days) / daysInMonth);
  return { amount, coveredFrom, coveredTo, days, daysInMonth };
}

/** Largest-remainder split of `total` (2dp) into n parts that sum exactly. */
function splitCents(total: number, n: number): number[] {
  const totalC = Math.round(total * 100);
  const base = Math.floor(totalC / n);
  let rem = totalC - base * n;
  return Array.from({ length: n }, () => {
    const c = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return c / 100;
  });
}

type Lease = {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
};

export async function previewPeriodCharges(db: Db, rawPeriod: string): Promise<ChargePreview> {
  const period = normalizePeriod(rawPeriod);
  const { end } = monthBounds(period);

  const [
    { data: leases, error: lErr },
    { data: units, error: uErr },
    { data: readings, error: rErr },
    { data: meters, error: mErr },
    { data: rates, error: tErr },
  ] = await Promise.all([
    db
      .from("leases")
      .select("id, unit_id, start_date, end_date, monthly_rent")
      .in("status", ["active", "ending"])
      .lte("start_date", end)
      .or(`end_date.is.null,end_date.gte.${period}`),
    db.from("units").select("id, building_id, name"),
    db
      .from("meter_readings")
      .select("id, meter_id, consumption")
      .eq("period", period)
      .eq("status", "approved"),
    db.from("meters").select("id, unit_id, building_id, type, serial_number"),
    db.from("utility_rates").select("id, type, effective_from, price_per_unit, fixed_monthly").lte("effective_from", period),
  ]);
  for (const e of [lErr, uErr, rErr, mErr, tErr]) if (e) throw new Error(e.message);

  const leaseList: Lease[] = (leases ?? []).map((l: any) => ({ ...l, monthly_rent: Number(l.monthly_rent) }));
  const leaseByUnit = new Map(leaseList.map((l) => [l.unit_id, l]));
  const unitBuilding = new Map((units ?? []).map((u: any) => [u.id, u.building_id as string | null]));
  const meterById = new Map((meters ?? []).map((m: any) => [m.id, m]));

  // latest rate per type with effective_from <= period (query already filtered by date)
  const rateByType = new Map<string, any>();
  for (const r of rates ?? []) {
    const cur = rateByType.get(r.type);
    if (!cur || r.effective_from > cur.effective_from) rateByType.set(r.type, r);
  }

  const lines: PreviewLine[] = [];
  const blocked: BlockedLine[] = [];

  // --- rent ---
  for (const l of leaseList) {
    const rent = rentForPeriod(l.monthly_rent, l.start_date, l.end_date, period);
    if (rent.days <= 0) continue;
    const full = rent.days >= rent.daysInMonth;
    lines.push({
      lease_id: l.id,
      unit_id: l.unit_id,
      period,
      kind: "rent",
      meter_reading_id: null,
      utility_rate_id: null,
      meter_type: null,
      description: full ? `rent ${period.slice(0, 7)}` : `rent ${rent.coveredFrom}..${rent.coveredTo} (${rent.days}/${rent.daysInMonth} d)`,
      quantity: full ? 1 : r3(rent.days / rent.daysInMonth),
      unit_price: l.monthly_rent,
      amount: rent.amount,
    });
  }

  // --- utilities from approved readings ---
  // (lease_id, rate_id) pairs that need a fixed fee row
  const fixedNeeded = new Map<string, { lease: Lease; rate: any; meterType: string }>();

  for (const rd of readings ?? []) {
    const meter = meterById.get(rd.meter_id);
    if (!meter) continue;
    const consumption = Number(rd.consumption);
    const rate = rateByType.get(meter.type);
    if (!rate) {
      blocked.push({
        reason: "no_rate",
        meter_type: meter.type,
        meter_reading_id: rd.id,
        unit_id: meter.unit_id,
        building_id: meter.building_id,
        period,
      });
      continue;
    }
    const price = Number(rate.price_per_unit);

    let targets: Lease[];
    if (meter.unit_id) {
      const l = leaseByUnit.get(meter.unit_id);
      if (!l) {
        blocked.push({ reason: "no_lease", meter_type: meter.type, meter_reading_id: rd.id, unit_id: meter.unit_id, building_id: null, period });
        continue;
      }
      targets = [l];
    } else {
      targets = leaseList
        .filter((l) => unitBuilding.get(l.unit_id) === meter.building_id)
        .sort((a, b) => a.id.localeCompare(b.id));
      if (targets.length === 0) {
        blocked.push({ reason: "no_building_leases", meter_type: meter.type, meter_reading_id: rd.id, unit_id: null, building_id: meter.building_id, period });
        continue;
      }
    }

    const n = targets.length;
    const totalCost = r2(consumption * price);
    const shares = n === 1 ? [totalCost] : splitCents(totalCost, n);
    targets.forEach((l, i) => {
      lines.push({
        lease_id: l.id,
        unit_id: l.unit_id,
        period,
        kind: "utility",
        meter_reading_id: rd.id,
        utility_rate_id: rate.id,
        meter_type: meter.type,
        description:
          n === 1
            ? `${meter.type} ${meter.serial_number} ${period.slice(0, 7)}`
            : `${meter.type} ${meter.serial_number} ${period.slice(0, 7)} (shared 1/${n})`,
        quantity: n === 1 ? r3(consumption) : r3(consumption / n),
        unit_price: price,
        amount: shares[i]!,
      });
      if (Number(rate.fixed_monthly) > 0) {
        fixedNeeded.set(`${l.id}:${rate.id}`, { lease: l, rate, meterType: meter.type });
      }
    });
  }

  // --- fixed monthly fees (one per lease × rate) ---
  for (const { lease, rate, meterType } of fixedNeeded.values()) {
    lines.push({
      lease_id: lease.id,
      unit_id: lease.unit_id,
      period,
      kind: "fixed",
      meter_reading_id: null,
      utility_rate_id: rate.id,
      meter_type: meterType,
      description: `${meterType} fixed fee ${period.slice(0, 7)}`,
      quantity: 1,
      unit_price: Number(rate.fixed_monthly),
      amount: r2(Number(rate.fixed_monthly)),
    });
  }

  const total = r2(lines.reduce((s, l) => s + l.amount, 0));
  return { period, lines, blocked, total };
}

export type GenerateResult = { period: string; created: number; skipped: number; blocked: number; failed: string[] };

/** Inserts every preview line; unique_violation = already generated = skipped. */
export async function generatePeriodCharges(db: Db, rawPeriod: string): Promise<GenerateResult> {
  const preview = await previewPeriodCharges(db, rawPeriod);
  let created = 0;
  let skipped = 0;
  const failed: string[] = [];
  for (const l of preview.lines) {
    const { error } = await db.from("charges").insert({
      lease_id: l.lease_id,
      period: l.period,
      kind: l.kind,
      meter_reading_id: l.meter_reading_id,
      utility_rate_id: l.utility_rate_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount: l.amount,
    });
    if (!error) created += 1;
    else if (error.code === "23505") skipped += 1;
    else failed.push(`${l.kind}/${l.lease_id}: ${error.message}`);
  }
  return { period: preview.period, created, skipped, blocked: preview.blocked.length, failed };
}
