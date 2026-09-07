import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getInvoiceForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const ensureInvoiceForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: booking, error: bErr } = await context.supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Rezervacija nerasta.");
    if (booking.status !== "confirmed") {
      throw new Error("Sąskaita generuojama tik apmokėtoms (patvirtintoms) rezervacijoms.");
    }
    const { generateInvoiceForBooking } = await import("./invoices.server");
    await generateInvoiceForBooking(data.bookingId);
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Nepavyko sugeneruoti sąskaitos.");
    return row;
  });