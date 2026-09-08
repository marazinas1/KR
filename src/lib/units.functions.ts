/** Unit (butas) management for the admin. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager, requireOwner } from "./admin-guard.server";
import { fetchAvailability, fetchDebtors, fetchMissingReadings } from "./dashboard-queries.server";
import { BUILDING_KINDS, UNIT_STATUSES, todayIso } from "./rental";

export type UnitListRow = {
  id: string;
  name: string;
  unit_number: string;
  floor: number | null;
  room_count: number;
  area_m2: number | null;
  monthly_rent: number;
  deposit: number;
  status: string;
  is_listed: boolean;
  is_active: boolean;
  address: string;
  city: string;
  cover_image_url: string;
  building_id: string | null;
  building_name: string | null;
  /** Days the unit has been standing empty (only for status `vacant`) — from `unit_availability`. */
  vacant_days: number | null;
  /** Real availability date — `unit_availability_calc()`, the same rule the public view uses. */
  available_from: string | null;
  tenant_name: string | null;
  lease_id: string | null;
  lease_end_date: string | null;
  lease_renewal: boolean | null;
  /** Σ charges − Σ payments on the holding lease; 0 when no lease or nothing owed. */
  balance: number;
  /** Active meters of this unit (or its building) without a reading this period. */
  missing_readings_count: number;
};


const unitInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  building_id: z.string().uuid().nullable().optional(),
  unit_number: z.string().max(40).default(""),
  floor: z.number().int().min(-5).max(100).nullable().optional(),
  room_count: z.number().int().min(0).max(50).default(1),
  area_m2: z.number().int().min(0).max(10000).nullable().optional(),
  monthly_rent: z.number().min(0).max(1_000_000).default(0),
  deposit: z.number().min(0).max(1_000_000).default(0),
  status: z.enum(UNIT_STATUSES).default("vacant"),
  address: z.string().max(200).default(""),
  city: z.string().max(120).default(""),
  country: z.string().max(120).default(""),
  description: z.string().max(4000).default(""),
  location_note: z.string().max(500).default(""),
  notes: z.string().max(4000).default(""),
  amenities: z.array(z.string().max(60)).default([]),
  cover_image_url: z.string().max(500).default(""),
  image_urls: z.array(z.string().max(500)).default([]),
  is_listed: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10000).default(0),
});

export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UnitListRow[]> => {
    await requireManager(context);
    const today = todayIso();
    const [{ data: units, error }, { data: buildings }, { data: tenants }, availability, debtors] =
      await Promise.all([
        context.supabase
          .from("units")
          .select(
            "id, name, unit_number, floor, room_count, area_m2, monthly_rent, deposit, status, is_listed, is_active, address, city, cover_image_url, building_id, created_at, sort_order",
          )
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        context.supabase.from("buildings").select("id, name"),
        context.supabase.from("tenants").select("id, first_name, last_name"),
        // Availability is NOT recomputed here: the view is the single source (AGENTS.md 5.7).
        fetchAvailability(context.supabase),
        fetchDebtors(context.supabase, today),
      ]);
    if (error) throw new Error(error.message);
    const { missing } = await fetchMissingReadings(context.supabase, availability);

    const buildingName = new Map((buildings ?? []).map((b) => [b.id, b.name]));
    const tenantName = new Map(
      (tenants ?? []).map((t) => [t.id, `${t.first_name} ${t.last_name}`.trim()]),
    );
    const avail = new Map(availability.map((a) => [a.unit_id, a]));
    const balanceByLease = new Map(debtors.map((d) => [d.lease_id, d.balance]));
    const missingByUnit = new Map<string, number>();
    const missingByBuilding = new Map<string, number>();
    for (const m of missing) {
      if (m.unit_id) missingByUnit.set(m.unit_id, (missingByUnit.get(m.unit_id) ?? 0) + 1);
      if (m.building_id)
        missingByBuilding.set(m.building_id, (missingByBuilding.get(m.building_id) ?? 0) + 1);
    }

    return (units ?? []).map((u) => {
      const a = avail.get(u.id);
      const leaseId = a?.holding_lease_id ?? null;
      return {
        ...u,
        building_name: u.building_id ? (buildingName.get(u.building_id) ?? null) : null,
        vacant_days: a?.vacant_days ?? null,
        available_from: a?.available_from ?? null,
        tenant_name: a?.holding_tenant_id ? (tenantName.get(a.holding_tenant_id) ?? null) : null,
        lease_id: leaseId,
        lease_end_date: a?.holding_end_date ?? null,
        lease_renewal: a?.holding_renewal ?? null,
        balance: leaseId ? (balanceByLease.get(leaseId) ?? 0) : 0,
        // Shared building meters count against every occupied unit of that building.
        missing_readings_count:
          (missingByUnit.get(u.id) ?? 0) +
          (leaseId && u.building_id ? (missingByBuilding.get(u.building_id) ?? 0) : 0),
      } as UnitListRow;
    });
  });


export const getUnit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: unit, error } = await context.supabase
      .from("units")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!unit) throw new Error("NotFound");
    const { data: building } = unit.building_id
      ? await context.supabase
          .from("buildings")
          .select("id, name, address, city, kind")
          .eq("id", unit.building_id)
          .maybeSingle()
      : { data: null };
    return { unit, building };
  });

export const saveUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => unitInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, amenities, image_urls, ...rest } = data;
    const row = {
      ...rest,
      building_id: rest.building_id ?? null,
      floor: rest.floor ?? null,
      area_m2: rest.area_m2 ?? null,
      amenities: amenities as unknown as never,
      image_urls: image_urls as unknown as never,
    };
    if (id) {
      const { error } = await context.supabase.from("units").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("units")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const setUnitListed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_listed: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase
      .from("units")
      .update({ is_listed: data.is_listed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { error } = await context.supabase.from("units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- buildings ---------------- */

export const listBuildings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireManager(context);
    const { data, error } = await context.supabase
      .from("buildings")
      .select("id, name, address, city, kind, is_active")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        address: z.string().max(200).default(""),
        city: z.string().max(120).default(""),
        postal_code: z.string().max(20).default(""),
        country: z.string().max(120).default(""),
        kind: z.enum(BUILDING_KINDS).default("apartment_building"),
        notes: z.string().max(2000).default(""),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, ...row } = data;
    if (id) {
      const { error } = await context.supabase.from("buildings").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("buildings")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

/* ---------------- timeline ---------------- */

export const listUnitEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ unit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: rows, error } = await context.supabase
      .from("unit_events")
      .select("*")
      .eq("unit_id", data.unit_id)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ---------------- costs ---------------- */

export const listUnitCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ unit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const [expenses, investments, maintenance] = await Promise.all([
      context.supabase
        .from("expenses")
        .select("id, category, amount, expense_date, note")
        .eq("unit_id", data.unit_id)
        .order("expense_date", { ascending: false }),
      context.supabase
        .from("property_investments")
        .select("id, category, amount, purchase_date, note")
        .eq("unit_id", data.unit_id)
        .order("purchase_date", { ascending: false }),
      context.supabase
        .from("property_maintenance")
        .select("id, type, due_date, last_done_at, note")
        .eq("unit_id", data.unit_id),
    ]);
    return {
      expenses: expenses.data ?? [],
      investments: investments.data ?? [],
      maintenance: maintenance.data ?? [],
    };
  });
