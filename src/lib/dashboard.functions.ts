/**
 * Admin "morning screen" — what needs attention today.
 *
 * One call, every query in parallel, as the signed-in manager (RLS applies).
 * Counts come from the same helpers the unit list filters use
 * (`dashboard-queries.server.ts`), so a card and the list it links to agree.
 * Availability is read from `unit_availability` — never recomputed.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./admin-guard.server";
import {
  fetchAvailability,
  fetchDebtors,
  fetchMissingReadings,
} from "./dashboard-queries.server";
import { currentPeriod, daysBetween, todayIso } from "./rental";

export type ExpiringLease = {
  lease_id: string;
  unit_id: string;
  unit_name: string;
  tenant_name: string;
  end_date: string;
  days_left: number;
  renewal: boolean;
};

export type Dashboard = {
  today: string;
  period: string;
  kpis: {
    activeUnits: number;
    occupiedUnits: number;
    occupancyPct: number;
    rentRoll: number;
    vacantUnits: number;
    debtTotal: number;
  };
  expiring: {
    d30: number;
    d60: number;
    d90: number;
    preview: ExpiringLease[];
  };
  vacant: {
    count: number;
    becomingVacant: number;
    preview: Array<{ unit_id: string; unit_name: string; vacant_days: number }>;
  };
  readings: {
    unitsMissing: number;
    unitsExpected: number;
    metersMissing: number;
    pendingReview: number;
    preview: Array<{ unit_id: string | null; label: string; count: number }>;
  };
  issues: {
    open: number;
    byPriority: Record<string, number>;
    preview: Array<{
      id: string;
      unit_id: string;
      unit_name: string;
      title: string;
      priority: string;
      status: string;
      created_at: string;
    }>;
  };
  debtors: {
    count: number;
    total: number;
    preview: Array<{ lease_id: string; unit_id: string; unit_name: string; tenant_name: string; balance: number }>;
  };
  inquiries: {
    newCount: number;
    preview: Array<{ id: string; name: string; unit_name: string | null; created_at: string }>;
  };
  documents: {
    count: number;
    preview: Array<{
      id: string;
      title: string;
      expires_at: string;
      unit_id: string | null;
      tenant_id: string | null;
      lease_id: string | null;
    }>;
  };
};

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"];

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Dashboard> => {
    await requireManager(context);
    const db = context.supabase;
    const today = todayIso();
    const period = currentPeriod();
    const plus = (days: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    const [
      availability,
      debtors,
      { data: units, error: uErr },
      { data: tenants },
      { data: buildings },
      { data: expiringLeases, error: eErr },
      { data: openIssues, error: iErr },
      { data: newInquiries, error: qErr },
      { data: expDocs, error: dErr },
    ] = await Promise.all([
      fetchAvailability(db),
      fetchDebtors(db, today),
      db.from("units").select("id, name, building_id, is_active"),
      db.from("tenants").select("id, first_name, last_name"),
      db.from("buildings").select("id, name"),
      // 1. Leases expiring within 90 days
      db
        .from("leases")
        .select("id, unit_id, tenant_id, end_date, renewal")
        .in("status", ["active", "ending"])
        .not("end_date", "is", null)
        .gte("end_date", today)
        .lte("end_date", plus(90))
        .order("end_date", { ascending: true }),
      // 4. Open faults
      db
        .from("issues")
        .select("id, unit_id, title, priority, status, created_at")
        .in("status", ["new", "acknowledged", "in_progress", "waiting"])
        .order("created_at", { ascending: true }),
      // 6. New inquiries
      db
        .from("rental_inquiries")
        .select("id, name, unit_id, created_at")
        .eq("status", "new")
        .order("created_at", { ascending: false }),
      // 7. Documents expiring within 30 days (already expired included)
      db
        .from("documents")
        .select("id, title, expires_at, unit_id, tenant_id, lease_id")
        .not("expires_at", "is", null)
        .lte("expires_at", plus(30))
        .order("expires_at", { ascending: true }),
    ]);
    if (uErr) throw new Error(uErr.message);
    if (eErr) throw new Error(eErr.message);
    if (iErr) throw new Error(iErr.message);
    if (qErr) throw new Error(qErr.message);
    if (dErr) throw new Error(dErr.message);

    const { missing, pendingReview } = await fetchMissingReadings(db, availability, period);

    const unitName = new Map((units ?? []).map((u: any) => [u.id, u.name as string]));
    const unitBuilding = new Map((units ?? []).map((u: any) => [u.id, u.building_id as string | null]));
    const buildingName = new Map((buildings ?? []).map((b: any) => [b.id, b.name as string]));
    const tenantName = new Map(
      (tenants ?? []).map((t: any) => [t.id, `${t.first_name} ${t.last_name}`.trim()]),
    );
    const activeUnitIds = new Set((units ?? []).filter((u: any) => u.is_active).map((u: any) => u.id));
    const activeAvail = availability.filter((a) => activeUnitIds.has(a.unit_id));

    // 8. Occupancy + rent roll
    const occupied = activeAvail.filter((a) => a.holding_lease_id !== null);
    const rentRoll = occupied.reduce((s, a) => s + (a.holding_monthly_rent ?? 0), 0);

    // 1. Buckets
    const exp = (expiringLeases ?? []).map((l: any) => ({
      lease_id: l.id as string,
      unit_id: l.unit_id as string,
      unit_name: unitName.get(l.unit_id) ?? "",
      tenant_name: tenantName.get(l.tenant_id) ?? "",
      end_date: l.end_date as string,
      days_left: daysBetween(today, l.end_date),
      renewal: Boolean(l.renewal),
    }));

    // 2. Vacant
    const vacant = activeAvail
      .filter((a) => a.status === "vacant")
      .sort((a, b) => (b.vacant_days ?? 0) - (a.vacant_days ?? 0));
    const becomingVacant = activeAvail.filter(
      (a) => a.status === "occupied" && a.available_from !== null,
    ).length;

    // 3. Missing readings grouped by unit (shared meters as one row per building)
    const occupiedUnitIds = new Set(occupied.map((a) => a.unit_id));
    const expectedUnits = new Set<string>();
    for (const a of occupied) expectedUnits.add(a.unit_id);
    const missingGroups = new Map<string, { unit_id: string | null; label: string; count: number }>();
    for (const m of missing) {
      const key = m.unit_id ? `u:${m.unit_id}` : `b:${m.building_id}`;
      const label = m.unit_id
        ? (unitName.get(m.unit_id) ?? "")
        : `${buildingName.get(m.building_id ?? "") ?? ""} (shared)`;
      const g = missingGroups.get(key) ?? { unit_id: m.unit_id, label, count: 0 };
      g.count += 1;
      missingGroups.set(key, g);
    }
    // A shared-meter gap affects every occupied unit in that building.
    const unitsMissing = new Set<string>();
    for (const m of missing) {
      if (m.unit_id) unitsMissing.add(m.unit_id);
      else
        for (const id of occupiedUnitIds)
          if (unitBuilding.get(id) === m.building_id) unitsMissing.add(id);
    }

    // 4. Issues
    const issuesSorted = [...(openIssues ?? [])].sort(
      (a: any, b: any) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) ||
        String(a.created_at).localeCompare(String(b.created_at)),
    );
    const byPriority: Record<string, number> = {};
    for (const i of issuesSorted) byPriority[i.priority] = (byPriority[i.priority] ?? 0) + 1;

    // 5. Debtors
    const debtTotal = debtors.reduce((s, d) => s + d.balance, 0);

    return {
      today,
      period,
      kpis: {
        activeUnits: activeAvail.length,
        occupiedUnits: occupied.length,
        occupancyPct: activeAvail.length ? Math.round((occupied.length / activeAvail.length) * 100) : 0,
        rentRoll: Math.round(rentRoll * 100) / 100,
        vacantUnits: vacant.length,
        debtTotal: Math.round(debtTotal * 100) / 100,
      },
      expiring: {
        d30: exp.filter((e) => e.days_left <= 30).length,
        d60: exp.filter((e) => e.days_left > 30 && e.days_left <= 60).length,
        d90: exp.filter((e) => e.days_left > 60 && e.days_left <= 90).length,
        preview: exp.slice(0, 5),
      },
      vacant: {
        count: vacant.length,
        becomingVacant,
        preview: vacant.slice(0, 5).map((a) => ({
          unit_id: a.unit_id,
          unit_name: unitName.get(a.unit_id) ?? "",
          vacant_days: a.vacant_days ?? 0,
        })),
      },
      readings: {
        unitsMissing: unitsMissing.size,
        unitsExpected: expectedUnits.size,
        metersMissing: missing.length,
        pendingReview,
        preview: [...missingGroups.values()].slice(0, 5),
      },
      issues: {
        open: issuesSorted.length,
        byPriority,
        preview: issuesSorted.slice(0, 5).map((i: any) => ({
          id: i.id,
          unit_id: i.unit_id,
          unit_name: unitName.get(i.unit_id) ?? "",
          title: i.title,
          priority: i.priority,
          status: i.status,
          created_at: i.created_at,
        })),
      },
      debtors: {
        count: debtors.length,
        total: Math.round(debtTotal * 100) / 100,
        preview: debtors.slice(0, 5).map((d) => ({
          ...d,
          unit_name: unitName.get(d.unit_id) ?? "",
          tenant_name: tenantName.get(d.tenant_id) ?? "",
        })),
      },
      inquiries: {
        newCount: (newInquiries ?? []).length,
        preview: (newInquiries ?? []).slice(0, 5).map((q: any) => ({
          id: q.id,
          name: q.name,
          unit_name: q.unit_id ? (unitName.get(q.unit_id) ?? null) : null,
          created_at: q.created_at,
        })),
      },
      documents: {
        count: (expDocs ?? []).length,
        preview: (expDocs ?? []).slice(0, 5) as Dashboard["documents"]["preview"],
      },
    };
  });
