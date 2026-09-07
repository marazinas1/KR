// Globalus Dashboard laikotarpio helperis
// SEMANTIKA: `to` yra EKSLUZYVI riba. Pvz. from=2026-05-10, to=2026-05-11 = 1 para.
// Presetai grąžina eksluzyvią `to` (pvz. praeitas mėnuo: from=05-01, to=06-01).
// Custom pasirinkimas (PeriodFilter) taip pat siunčia eksluzyvią `to`:
// vartotojas pasirenka pradžios ir grąžinimo datas, kaip nuomos sutartyje.
export const PERIOD_KEYS = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "mtd",
  "prev_month",
  "ytd",
  "all",
  "custom",
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABEL_KEYS: Record<PeriodKey, string> = {
  today: "dashboard.period.today",
  yesterday: "dashboard.period.yesterday",
  last7: "dashboard.period.last7",
  last30: "dashboard.period.last30",
  mtd: "dashboard.period.mtd",
  prev_month: "dashboard.period.prev_month",
  ytd: "dashboard.period.ytd",
  all: "dashboard.period.all",
  custom: "dashboard.period.custom",
};

export type ResolvedRange = { from: string | null; to: string | null };

function iso(d: Date) {
  // Local-date ISO (YYYY-MM-DD), nepriklauso nuo laiko juostos
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

export function resolvePeriod(
  period: PeriodKey,
  from?: string | null,
  to?: string | null,
  now: Date = new Date(),
): ResolvedRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  switch (period) {
    case "today":
      return { from: iso(today), to: iso(tomorrow) };
    case "yesterday":
      return { from: iso(addDays(today, -1)), to: iso(today) };
    case "last7":
      return { from: iso(addDays(today, -6)), to: iso(tomorrow) };
    case "last30":
      return { from: iso(addDays(today, -29)), to: iso(tomorrow) };
    case "mtd":
      return {
        from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: iso(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
      };
    case "prev_month":
      // Nuomos „nakčių" modelis: nuo mėn. 1 d. iki paskutinės mėn. dienos (eksluzyvi checkout).
      // Pvz. gegužė: 05-01 → 05-31 = 30 parų.
      return {
        from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case "ytd":
      return {
        from: iso(new Date(today.getFullYear(), 0, 1)),
        to: iso(new Date(today.getFullYear() + 1, 0, 1)),
      };
    case "all":
      return { from: null, to: null };
    case "custom":
      return { from: from || null, to: to || null };
  }
}

// Display helper: paverčia eksluzyvią `to` į inkliuzyvią (atimam 1 dieną)
function inclusiveTo(toExclusive: string): string {
  const t = new Date(toExclusive + "T00:00:00Z").getTime();
  const d = new Date(t - 86400000);
  return iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatPeriodLabel(
  period: PeriodKey,
  range: ResolvedRange,
  t: (key: string) => string,
): string {
  const base = t(PERIOD_LABEL_KEYS[period]);
  if (period === "all") return base;
  if (!range.from) return base;
  // Custom — vartotojas pasirinko savo `from` / `to` (nuomos sutarties stilius),
  // rodom kaip pasirinkta.
  if (period === "custom" || period === "prev_month") {
    // Nuomos stilius: rodom `to` tokį, koks yra (checkout diena).
    if (!range.to) return `${base} · ${range.from} → …`;
    if (range.from === range.to) return `${base} · ${range.from}`;
    return `${base} · ${range.from} → ${range.to}`;
  }
  // Kiti presetai turi eksluzyvią `to` — rodom inkliuzyvią vartotojui pažįstamą datą.
  if (!range.to) return `${base} · ${range.from}`;
  const incTo = inclusiveTo(range.to);
  if (range.from === incTo) return `${base} · ${range.from}`;
  return `${base} · ${range.from} → ${incTo}`;
}

export function periodDays(range: ResolvedRange, fallbackEnd: Date = new Date()): number {
  if (!range.from) return 0;
  const a = new Date(range.from + "T00:00:00Z").getTime();
  const b = new Date((range.to ?? iso(fallbackEnd)) + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}
