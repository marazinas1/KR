// Server-only: verslo analitika AI pagalbininkui (užimtumas, pajamos, ADR,
// RevPAR, išlaidos, pelnas, ROI, prognozė). Skaičiuojama iš rezervacijų,
// išlaidų ir investicijų – tik skaitymas.
import type { AssistantLang } from "./assistant-knowledge";

type AnySupabase = { from: (table: string) => any };

type BookingRow = {
  property_id: string;
  date_from: string;
  date_to: string;
  status: string;
  source: string | null;
  total_amount: number | string | null;
  payment_status: string | null;
  created_at: string | null;
  total_guests: number | null;
};

type PropertyRow = {
  id: string;
  name: string;
  is_active: boolean;
  price_per_night: number | string | null;
  created_at: string | null;
};

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function daysBetween(a: string, b: string) {
  const ta = new Date(a + "T00:00:00Z").getTime();
  const tb = new Date(b + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((tb - ta) / 86400000));
}
function overlapNights(from: string, to: string, rf: string, rt: string) {
  const a = from > rf ? from : rf;
  const b = to < rt ? to : rt;
  return daysBetween(a, b);
}
const money = (n: number) => `${Math.round(n).toLocaleString("lt-LT")} €`;
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

type Period = { key: string; lt: string; en: string; from: string; to: string }; // to – ekskliuzyvi

function buildPeriods(now: Date): Period[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  const y = today.getFullYear();
  return [
    { key: "today", lt: "Šiandien", en: "Today", from: iso(today), to: iso(tomorrow) },
    { key: "yesterday", lt: "Vakar", en: "Yesterday", from: iso(addDays(today, -1)), to: iso(today) },
    { key: "last7", lt: "Paskutinės 7 d.", en: "Last 7 days", from: iso(addDays(today, -6)), to: iso(tomorrow) },
    { key: "last30", lt: "Paskutinės 30 d.", en: "Last 30 days", from: iso(addDays(today, -29)), to: iso(tomorrow) },
    { key: "mtd", lt: "Šis mėnuo", en: "This month", from: iso(new Date(y, today.getMonth(), 1)), to: iso(new Date(y, today.getMonth() + 1, 1)) },
    { key: "prev_month", lt: "Praėjęs mėnuo", en: "Previous month", from: iso(new Date(y, today.getMonth() - 1, 1)), to: iso(new Date(y, today.getMonth(), 1)) },
    { key: "ytd", lt: `Šie metai (${y})`, en: `This year (${y})`, from: iso(new Date(y, 0, 1)), to: iso(new Date(y + 1, 0, 1)) },
    { key: "prev_year", lt: `Praėję metai (${y - 1})`, en: `Last year (${y - 1})`, from: iso(new Date(y - 1, 0, 1)), to: iso(new Date(y, 0, 1)) },
    { key: "next30", lt: "Ateinančios 30 d. (prognozė)", en: "Next 30 days (forecast)", from: iso(tomorrow), to: iso(addDays(tomorrow, 30)) },
    { key: "next90", lt: "Ateinančios 90 d. (prognozė)", en: "Next 90 days (forecast)", from: iso(tomorrow), to: iso(addDays(tomorrow, 90)) },
  ];
}

function isRevenueBooking(b: BookingRow) {
  return b.status === "confirmed" || b.status === "completed";
}
function isOccupying(b: BookingRow) {
  return b.status !== "cancelled";
}

/** Pajamos priskiriamos proporcingai nakvynėms (accrual), kad „šiandien“ / „vakar“ būtų prasmingi. */
function accruedRevenue(bookings: BookingRow[], from: string, to: string) {
  let sum = 0;
  for (const b of bookings) {
    if (!isRevenueBooking(b)) continue;
    const nights = daysBetween(b.date_from, b.date_to);
    if (nights === 0) continue;
    const ov = overlapNights(b.date_from, b.date_to, from, to);
    if (ov > 0) sum += (Number(b.total_amount ?? 0) / nights) * ov;
  }
  return sum;
}

function periodStats(
  p: Period,
  bookings: BookingRow[],
  activeCount: number,
  expenses: { amount: number; date: string }[],
) {
  const days = daysBetween(p.from, p.to);
  const availableNights = activeCount * days;
  const overlapping = bookings.filter((b) => isOccupying(b) && b.date_from < p.to && b.date_to > p.from);
  const bookedNights = overlapping.reduce((s, b) => s + overlapNights(b.date_from, b.date_to, p.from, p.to), 0);
  const revenue = accruedRevenue(bookings, p.from, p.to);
  const paidNights = overlapping
    .filter(isRevenueBooking)
    .reduce((s, b) => s + overlapNights(b.date_from, b.date_to, p.from, p.to), 0);
  const occupancy = availableNights > 0 ? bookedNights / availableNights : 0;
  const adr = paidNights > 0 ? revenue / paidNights : 0;
  const revpar = availableNights > 0 ? revenue / availableNights : 0;
  const created = bookings.filter((b) => b.created_at && b.created_at.slice(0, 10) >= p.from && b.created_at.slice(0, 10) < p.to);
  const createdActive = created.filter((b) => b.status !== "cancelled");
  const createdValue = createdActive.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
  const cancelled = created.filter((b) => b.status === "cancelled").length;
  const exp = expenses.filter((e) => e.date >= p.from && e.date < p.to).reduce((s, e) => s + e.amount, 0);
  return { days, availableNights, bookedNights, occupancy, revenue, adr, revpar, createdCount: createdActive.length, createdValue, cancelled, createdTotal: created.length, expenses: exp, profit: revenue - exp };
}

export async function buildBusinessAnalytics(supabase: AnySupabase, lang: AssistantLang, now = new Date()): Promise<string> {
  const en = lang === "en";
  const [propsRes, bookingsRes, expRes, invRes, evRes] = await Promise.all([
    supabase.from("properties").select("id, name, is_active, price_per_night, created_at"),
    supabase.from("bookings").select("property_id, date_from, date_to, status, source, total_amount, payment_status, created_at, total_guests"),
    supabase.from("expenses").select("amount, expense_date, category"),
    supabase.from("property_investments").select("amount, purchase_date, property_id"),
    supabase.from("property_events").select("cost, started_at"),
  ]);
  if (propsRes.error || bookingsRes.error) return en ? "(analytics unavailable)" : "(analitika nepasiekiama)";

  const properties = (propsRes.data ?? []) as PropertyRow[];
  const bookings = (bookingsRes.data ?? []) as BookingRow[];
  const expenses = ((expRes.data ?? []) as { amount: unknown; expense_date: string; category: string }[]).map((e) => ({
    amount: Number(e.amount ?? 0),
    date: e.expense_date,
    category: e.category,
  }));
  const eventCosts = ((evRes.data ?? []) as { cost: unknown; started_at: string }[])
    .filter((e) => e.cost != null)
    .map((e) => ({ amount: Number(e.cost), date: String(e.started_at).slice(0, 10), category: "event" }));
  const allExpenses = [...expenses, ...eventCosts];
  const investments = ((invRes.data ?? []) as { amount: unknown }[]).reduce((s, i) => s + Number(i.amount ?? 0), 0);

  const activeProps = properties.filter((p) => p.is_active);
  const activeCount = activeProps.length;
  const today = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const periods = buildPeriods(now);

  const L = (lt: string, e: string) => (en ? e : lt);
  const lines: string[] = [];
  lines.push(L(`Data: ${today}. Aktyvių objektų: ${activeCount} iš ${properties.length}.`, `Date: ${today}. Active properties: ${activeCount} of ${properties.length}.`));
  lines.push(L(
    "Pajamos skaičiuojamos pagal nakvynes (accrual): rezervacijos suma padalinta proporcingai jos naktims; įtraukiamos tik patvirtintos/užbaigtos rezervacijos. Užimtumas = užimtos naktys / (aktyvūs objektai × dienos). ADR = pajamos / parduotos naktys. RevPAR = pajamos / galimos naktys.",
    "Revenue is accrued per night: a booking's total is spread proportionally over its nights; only confirmed/completed bookings count. Occupancy = booked nights / (active properties × days). ADR = revenue / sold nights. RevPAR = revenue / available nights.",
  ));
  lines.push("");
  lines.push(L("## Laikotarpių rodikliai", "## Period metrics"));
  for (const p of periods) {
    const s = periodStats(p, bookings, activeCount, allExpenses);
    lines.push(
      `- ${en ? p.en : p.lt} (${p.from} → ${p.to}, ${s.days} ${L("d.", "days")}): ` +
        L(
          `pajamos ${money(s.revenue)}; užimtumas ${pct(s.occupancy)} (${s.bookedNights}/${s.availableNights} naktų); ADR ${money(s.adr)}; RevPAR ${money(s.revpar)}; išlaidos ${money(s.expenses)}; pelnas ${money(s.profit)}; naujų rezervacijų sukurta ${s.createdCount} (vertė ${money(s.createdValue)}), atšaukta ${s.cancelled}.`,
          `revenue ${money(s.revenue)}; occupancy ${pct(s.occupancy)} (${s.bookedNights}/${s.availableNights} nights); ADR ${money(s.adr)}; RevPAR ${money(s.revpar)}; expenses ${money(s.expenses)}; profit ${money(s.profit)}; new bookings created ${s.createdCount} (value ${money(s.createdValue)}), cancelled ${s.cancelled}.`,
        ),
    );
  }

  // Visų laikų
  const allRevenue = bookings.filter(isRevenueBooking).reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
  const allExp = allExpenses.reduce((s, e) => s + e.amount, 0);
  const allProfit = allRevenue - allExp;
  const firstDate = bookings.map((b) => b.date_from).sort()[0];
  lines.push("");
  lines.push(L("## Visų laikų suvestinė", "## All-time summary"));
  lines.push(L(
    `- Pajamos ${money(allRevenue)}, išlaidos ${money(allExp)}, grynasis pelnas ${money(allProfit)}; pirmoji rezervacija: ${firstDate ?? "—"}; iš viso rezervacijų: ${bookings.length}.`,
    `- Revenue ${money(allRevenue)}, expenses ${money(allExp)}, net profit ${money(allProfit)}; first booking: ${firstDate ?? "—"}; total bookings: ${bookings.length}.`,
  ));

  // ROI
  const ytd = periodStats(periods.find((p) => p.key === "ytd")!, bookings, activeCount, allExpenses);
  const last12 = periodStats({ key: "l12", lt: "", en: "", from: iso(addDays(new Date(today), -365)), to: iso(addDays(new Date(today), 1)) }, bookings, activeCount, allExpenses);
  lines.push("");
  lines.push(L("## ROI (investicijų grąža)", "## ROI (return on investment)"));
  if (investments > 0) {
    lines.push(L(
      `- Registruotos investicijos (Finansai → Investicijos): ${money(investments)}. Metinis ROI pagal paskutinių 12 mėn. pelną (${money(last12.profit)}): ${pct(last12.profit / investments)}. ROI nuo pradžios (visų laikų pelnas / investicijos): ${pct(allProfit / investments)}. Atsipirkimas esant dabartiniam tempui: ${last12.profit > 0 ? `${(investments / last12.profit).toFixed(1)} ${L("m.", "yrs")}` : L("neapskaičiuojamas (pelnas ≤ 0)", "n/a (profit ≤ 0)")}.`,
      `- Recorded investments (Finance → Investments): ${money(investments)}. Annual ROI on trailing-12-month profit (${money(last12.profit)}): ${pct(last12.profit / investments)}. ROI since start (all-time profit / investments): ${pct(allProfit / investments)}. Payback at current pace: ${last12.profit > 0 ? `${(investments / last12.profit).toFixed(1)} yrs` : "n/a (profit ≤ 0)"}.`,
    ));
  } else {
    lines.push(L(
      "- Investicijų suma neįvesta, todėl ROI apskaičiuoti negalima. Pasiūlykite įvesti pirkimo/įrengimo sumas: Finansai → Investicijos (prie objekto). Galite pateikti tik pelną ir pelningumą (pelnas / pajamos).",
      "- No investments recorded, so ROI cannot be computed. Suggest entering purchase/fit-out amounts under Finance → Investments (per property). You can still give profit and margin (profit / revenue).",
    ));
  }
  if (ytd.revenue > 0) lines.push(L(`- Pelningumas šiais metais: ${pct(ytd.profit / ytd.revenue)}.`, `- Margin this year: ${pct(ytd.profit / ytd.revenue)}.`));

  // Per objektą (YTD)
  const ytdP = periods.find((p) => p.key === "ytd")!;
  lines.push("");
  lines.push(L("## Pagal objektą (šie metai)", "## Per property (this year)"));
  for (const p of properties) {
    const pb = bookings.filter((b) => b.property_id === p.id);
    const s = periodStats(ytdP, pb, 1, []);
    const l30 = periodStats(periods.find((x) => x.key === "last30")!, pb, 1, []);
    lines.push(
      `- ${p.name}${p.is_active ? "" : L(" (neaktyvus)", " (inactive)")}: ` +
        L(
          `bazinė kaina ${money(Number(p.price_per_night ?? 0))}/naktis; užimtumas YTD ${pct(s.occupancy)}, pajamos ${money(s.revenue)}, ADR ${money(s.adr)}; paskutinės 30 d. užimtumas ${pct(l30.occupancy)}.`,
          `base price ${money(Number(p.price_per_night ?? 0))}/night; YTD occupancy ${pct(s.occupancy)}, revenue ${money(s.revenue)}, ADR ${money(s.adr)}; last-30-day occupancy ${pct(l30.occupancy)}.`,
        ),
    );
  }

  // Šaltiniai, viešnagės trukmė, lead time
  const active = bookings.filter((b) => b.status !== "cancelled" && b.status !== "blocked_external");
  const bySource: Record<string, number> = {};
  for (const b of active) bySource[b.source ?? "other"] = (bySource[b.source ?? "other"] ?? 0) + 1;
  const avgStay = active.length ? active.reduce((s, b) => s + daysBetween(b.date_from, b.date_to), 0) / active.length : 0;
  const leads = active.filter((b) => b.created_at).map((b) => daysBetween(b.created_at!.slice(0, 10), b.date_from));
  const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0;
  const cancelledAll = bookings.filter((b) => b.status === "cancelled").length;
  const cancelRate = bookings.length ? cancelledAll / bookings.length : 0;
  const unpaid = bookings.filter((b) => b.status !== "cancelled" && (b.payment_status === "unpaid" || b.payment_status === "pending"));
  const unpaidTotal = unpaid.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
  const dow = [0, 0, 0, 0, 0, 0, 0];
  for (const b of active) {
    let d = new Date(b.date_from + "T00:00:00Z");
    const end = new Date(b.date_to + "T00:00:00Z");
    while (d < end) {
      dow[d.getUTCDay()]++;
      d = new Date(d.getTime() + 86400000);
    }
  }
  const dowNames = en ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Sk", "Pr", "An", "Tr", "Kt", "Pn", "Št"];
  lines.push("");
  lines.push(L("## Struktūra ir elgsena", "## Mix and behaviour"));
  lines.push(L(`- Rezervacijos pagal šaltinį: ${Object.entries(bySource).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}.`, `- Bookings by source: ${Object.entries(bySource).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}.`));
  lines.push(L(`- Vidutinė viešnagė ${avgStay.toFixed(1)} nakties; vidutinis rezervavimas prieš ${avgLead.toFixed(0)} d. iki atvykimo; atšaukimų dalis ${pct(cancelRate)}.`, `- Average stay ${avgStay.toFixed(1)} nights; average lead time ${avgLead.toFixed(0)} days; cancellation rate ${pct(cancelRate)}.`));
  lines.push(L(`- Užimtos naktys pagal savaitės dieną (visų laikų): ${dowNames.map((n, i) => `${n} ${dow[i]}`).join(", ")}.`, `- Occupied nights by weekday (all-time): ${dowNames.map((n, i) => `${n} ${dow[i]}`).join(", ")}.`));
  lines.push(L(`- Laukia apmokėjimo: ${unpaid.length} rezervacijos, ${money(unpaidTotal)}.`, `- Awaiting payment: ${unpaid.length} bookings, ${money(unpaidTotal)}.`));
  const expByCat: Record<string, number> = {};
  for (const e of allExpenses) expByCat[e.category] = (expByCat[e.category] ?? 0) + e.amount;
  lines.push(L(`- Išlaidos pagal kategoriją (visų laikų): ${Object.entries(expByCat).map(([k, v]) => `${k} ${money(v)}`).join(", ") || "—"}.`, `- Expenses by category (all-time): ${Object.entries(expByCat).map(([k, v]) => `${k} ${money(v)}`).join(", ") || "—"}.`));

  return lines.join("\n");
}
