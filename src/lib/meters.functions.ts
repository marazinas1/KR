/** Meters and readings for a unit. Consumption is computed by the database
 *  trigger — never here. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager, requireOwner } from "./admin-guard.server";
import { METER_TYPES } from "./rental";

export const listUnitMeters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ unit_id: z.string().uuid(), building_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const own = await context.supabase
      .from("meters")
      .select("id, unit_id, building_id, type, serial_number, uom, initial_reading, is_active, notes")
      .eq("unit_id", data.unit_id);
    if (own.error) throw new Error(own.error.message);
    const shared = data.building_id
      ? await context.supabase
          .from("meters")
          .select("id, unit_id, building_id, type, serial_number, uom, initial_reading, is_active, notes")
          .eq("building_id", data.building_id)
      : { data: [], error: null };

    const meters = [...(own.data ?? []), ...(shared.data ?? [])];
    const ids = meters.map((m) => m.id);
    const { data: readings } = ids.length
      ? await context.supabase
          .from("meter_readings")
          .select("id, meter_id, period, value, consumption, status, needs_review, note, photo_path, submitted_at")
          .in("meter_id", ids)
          .order("period", { ascending: false })
      : { data: [] };

    return { meters, readings: readings ?? [] };
  });

export const saveMeter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        unit_id: z.string().uuid(),
        type: z.enum(METER_TYPES),
        serial_number: z.string().max(60).default(""),
        uom: z.string().max(20).default("kWh"),
        initial_reading: z.number().min(0).default(0),
        digits: z.number().int().min(1).max(12).nullable().optional(),
        is_active: z.boolean().default(true),
        notes: z.string().max(1000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, ...row } = data;
    if (id) {
      const { error } = await context.supabase.from("meters").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("meters")
      .insert({ ...row, building_id: null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const deleteMeter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { error } = await context.supabase.from("meters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        meter_id: z.string().uuid(),
        /** Any date inside the month; stored as the first of the month. */
        period: z.string().min(7),
        value: z.number().min(0),
        note: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const period = `${data.period.slice(0, 7)}-01`;
    const { error } = await context.supabase.from("meter_readings").insert({
      meter_id: data.meter_id,
      period,
      value: data.value,
      note: data.note,
      status: "approved",
      submitted_by: context.userId,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const patch = {
      status: data.status,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      needs_review: false,
      ...(data.note !== undefined ? { note: data.note } : {}),
    };
    const { error } = await context.supabase.from("meter_readings").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Short-lived link to a meter photo in the private bucket. */
export const signMeterPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: signed, error } = await context.supabase.storage
      .from("meter-photos")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
