/** Rental inquiries from the public site, as seen by the admin. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./admin-guard.server";
import { INQUIRY_STATUSES } from "./rental";

export type InquiryRow = {
  id: string;
  unit_id: string | null;
  unit_name: string | null;
  name: string;
  phone: string;
  email: string;
  move_in_date: string | null;
  message: string;
  status: string;
  source: string;
  converted_lease_id: string | null;
  created_at: string;
};

const COLUMNS =
  "id, unit_id, name, phone, email, move_in_date, message, status, source, converted_lease_id, created_at";

export const listInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InquiryRow[]> => {
    await requireManager(context);
    const [{ data, error }, { data: units }] = await Promise.all([
      context.supabase.from("rental_inquiries").select(COLUMNS).order("created_at", {
        ascending: false,
      }),
      context.supabase.from("units").select("id, name"),
    ]);
    if (error) throw new Error(error.message);
    const unitName = new Map((units ?? []).map((u) => [u.id, u.name]));
    return (data ?? []).map((r) => ({
      ...(r as Omit<InquiryRow, "unit_name">),
      unit_name: r.unit_id ? (unitName.get(r.unit_id) ?? null) : null,
    }));
  });

export const setInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(INQUIRY_STATUSES) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase
      .from("rental_inquiries")
      .update({ status: data.status, handled_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Convert an inquiry into a DRAFT lease.
 *
 * The tenant row and the lease row are created by one database function, so
 * they share a single transaction: if the lease is rejected because the dates
 * overlap an existing lease for that unit, the new tenant is rolled back too
 * and nothing is left dangling.
 */
export const convertInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        inquiry_id: z.string().uuid(),
        unit_id: z.string().uuid(),
        tenant_id: z.string().uuid().nullable().optional(),
        first_name: z.string().max(80).default(""),
        last_name: z.string().max(80).default(""),
        phone: z.string().max(60).default(""),
        email: z.string().max(160).default(""),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z
          .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
          .nullable()
          .optional(),
        monthly_rent: z.number().min(0).max(1_000_000).default(0),
        deposit: z.number().min(0).max(1_000_000).default(0),
        payment_day: z.number().int().min(1).max(28).default(1),
        notice_days: z.number().int().min(0).max(365).default(30),
        notes: z.string().max(2000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ lease_id: string; tenant_id: string }> => {
    await requireManager(context);
    const { data: rows, error } = await context.supabase.rpc("convert_inquiry_to_lease", {
      _inquiry_id: data.inquiry_id,
      _unit_id: data.unit_id,
      _start_date: data.start_date,
      _monthly_rent: data.monthly_rent,
      _deposit: data.deposit,
      _payment_day: data.payment_day,
      _notice_days: data.notice_days,
      _tenant_id: data.tenant_id ?? undefined,
      _first_name: data.first_name,
      _last_name: data.last_name,
      _phone: data.phone,
      _email: data.email,
      _end_date: data.end_date ? data.end_date : undefined,
      _notes: data.notes,
    });
    if (error) {
      throw new Error(
        error.message.includes("leases_no_overlap") ? "LeaseOverlap" : error.message,
      );
    }
    const row = (Array.isArray(rows) ? rows[0] : rows) as
      | { lease_id: string; tenant_id: string }
      | undefined;
    if (!row) throw new Error("ConvertFailed");
    return row;
  });
