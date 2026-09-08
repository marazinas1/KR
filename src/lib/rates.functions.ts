/**
 * Utility tariffs. A rate is NEVER edited or deleted in place — a change is a
 * new row with a later effective_from, so historical charges keep pointing at
 * the tariff they were computed with (utility_rate_id audit link).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager, requireOwner } from "./admin-guard.server";
import { METER_TYPES } from "./rental";

export type RateRow = {
  id: string;
  type: string;
  effective_from: string;
  price_per_unit: number;
  fixed_monthly: number;
  note: string;
  created_at: string;
};

export const listRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireManager(context);
    const { data, error } = await context.supabase
      .from("utility_rates")
      .select("id, type, effective_from, price_per_unit, fixed_monthly, note, created_at")
      .order("type")
      .order("effective_from", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any): RateRow => ({
      ...r,
      price_per_unit: Number(r.price_per_unit),
      fixed_monthly: Number(r.fixed_monthly),
    }));
  });

export const addRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        type: z.enum(METER_TYPES),
        effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        price_per_unit: z.number().nonnegative().max(100000),
        fixed_monthly: z.number().nonnegative().max(100000).default(0),
        note: z.string().max(300).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { error } = await context.supabase.from("utility_rates").insert(data);
    if (error) {
      if (error.code === "23505") throw new Error("RateExists");
      throw new Error(error.message);
    }
    return { ok: true };
  });
