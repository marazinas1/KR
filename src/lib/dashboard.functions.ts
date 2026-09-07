import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rangeInput = z.object({
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
});

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

function daysBetween(a: string, b: string) {
  const ta = new Date(a + "T00:00:00Z").getTime();
  const tb = new Date(b + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((tb - ta) / 86400000));
}

function overlapNights(from: string, to: string, rangeFrom: string, rangeTo: string) {
  const a = from > rangeFrom ? from : rangeFrom;
  const b = to < rangeTo ? to : rangeTo;
  return daysBetween(a, b);
}

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rangeInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const [propsRes, bookingsRes, expensesRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id, name, category, property_type, price_per_night, is_active, status, sort_order, created_at"),
      supabase.from("bookings").select("*, properties(id,name)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*"),
    ]);
    if (propsRes.error) throw new Error(propsRes.error.message);
    if (bookingsRes.error) throw new Error(bookingsRes.error.message);
    if (expensesRes.error) throw new Error(expensesRes.error.message);

    const properties = propsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const activeProps = properties.filter((p: any) => p.is_active);
    const rangeFrom = data.from ?? null;
    const rangeTo = data.to ?? null;

    const inRange = (b: any) => {
      if (b.status === "cancelled") return false;
      if (!rangeFrom || !rangeTo) return true;
      return b.date_from < rangeTo && b.date_to > rangeFrom;
    };

    const rangeBookings = bookings.filter(inRange);
    const revenue = rangeBookings
      .filter((b: any) => b.status === "confirmed" || b.status === "completed")
      .reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0);

    const avgBookingValue = rangeBookings.length
      ? revenue / rangeBookings.length
      : 0;

    // utilization
    let utilization = 0;
    if (rangeFrom && rangeTo && activeProps.length > 0) {
      const totalNights = activeProps.length * daysBetween(rangeFrom, rangeTo);
      const bookedNights = rangeBookings.reduce(
        (s: number, b: any) => s + overlapNights(b.date_from, b.date_to, rangeFrom, rangeTo),
        0,
      );
      utilization = totalNights > 0 ? bookedNights / totalNights : 0;
    }

    // laisvi šiandien
    const busyToday = new Set(
      bookings
        .filter((b: any) => b.status !== "cancelled" && b.date_from <= today && b.date_to > today)
        .map((b: any) => b.property_id),
    );
    const freeToday = activeProps.filter((p: any) => !busyToday.has(p.id)).length;

    const confirmed30d = bookings.filter(
      (b: any) => b.status === "confirmed" && b.date_from >= today && b.date_from <= in30,
    ).length;

    const awaitingPayment = bookings.filter(
      (b: any) =>
        b.status !== "cancelled" &&
        (b.payment_status === "unpaid" || b.payment_status === "pending"),
    );

    // check-in / check-out today
    const checkinsToday = bookings.filter(
      (b: any) => b.status !== "cancelled" && b.date_from === today,
    );
    const checkoutsToday = bookings.filter(
      (b: any) => b.status !== "cancelled" && b.date_to === today,
    );

    const recent24h = bookings
      .filter((b: any) => {
        if (!b.created_at) return false;
        return Date.now() - new Date(b.created_at).getTime() < 86400000;
      })
      .slice(0, 10);

    // parkas
    const byType: Record<string, number> = {};
    for (const p of properties) {
      const k = p.property_type || "kita";
      byType[k] = (byType[k] ?? 0) + 1;
    }
    const avgPrice = activeProps.length
      ? activeProps.reduce((s: number, p: any) => s + Number(p.price_per_night ?? 0), 0) / activeProps.length
      : 0;
    const missingPhotos = properties.filter(
      (p: any) => !p.cover_image_url && (!p.image_urls || (p.image_urls as any[]).length === 0),
    ).length;
    const missingDescription = properties.filter((p: any) => !p.description).length;

    // verslas
    const rangeExpenses = expenses.filter((e: any) => {
      if (!rangeFrom || !rangeTo) return true;
      return e.date >= rangeFrom && e.date < rangeTo;
    });
    const expensesTotal = rangeExpenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const expensesByCategory: Record<string, number> = {};
    for (const e of rangeExpenses) {
      const k = e.category || "kita";
      expensesByCategory[k] = (expensesByCategory[k] ?? 0) + Number(e.amount ?? 0);
    }
    const netProfit = revenue - expensesTotal;

    const totalNightsBooked = rangeBookings.reduce(
      (s: number, b: any) => s + daysBetween(b.date_from, b.date_to),
      0,
    );
    const avgStayNights = rangeBookings.length ? totalNightsBooked / rangeBookings.length : 0;

    return {
      operations: {
        revenue,
        utilization,
        freeToday,
        totalActive: activeProps.length,
        confirmed30d,
        awaitingPayment: {
          count: awaitingPayment.length,
          total: awaitingPayment.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0),
        },
        avgBookingValue,
      },
      fleet: {
        total: properties.length,
        active: activeProps.length,
        byType,
        avgPrice,
        missingPhotos,
        missingDescription,
      },
      business: {
        netProfit,
        revenue,
        expensesTotal,
        expensesByCategory,
        avgStayNights,
      },
      checkinsToday,
      checkoutsToday,
      awaitingPaymentList: awaitingPayment.slice(0, 10),
      recent24h,
    };
  });
