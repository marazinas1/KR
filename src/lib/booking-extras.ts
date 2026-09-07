export type ExtraCalcKind = "per_person" | "per_child" | "flat_per_day";

export type BookingExtra = {
  name: string;
  calc: ExtraCalcKind;
  pricePerDay: number;
  amount: number;
};

export function nightsBetweenDates(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function extraLineTotal(
  calc: ExtraCalcKind,
  pricePerDay: number,
  ctx: { adults: number; children: number; infants: number; days: number },
): number {
  const days = Math.max(0, ctx.days);
  const price = Math.max(0, Number(pricePerDay) || 0);
  if (days === 0 || price === 0) return 0;
  if (calc === "per_person") return (Math.max(0, ctx.adults) + Math.max(0, ctx.children)) * days * price;
  if (calc === "per_child") return Math.max(0, ctx.children) * days * price;
  return days * price;
}

/** Perskaičiuoja pasirinktas paslaugas pagal objekto įraše saugomas kainas. */
export function recalcExtras(
  defined: Array<{ name: string; calc: ExtraCalcKind; pricePerDay: number }>,
  selected: Array<{ name: string }>,
  ctx: { adults: number; children: number; infants: number; days: number },
): { extras: BookingExtra[]; extras_total: number } {
  const extras: BookingExtra[] = [];
  for (const sel of selected) {
    const match = defined.find((d) => d.name === sel.name);
    if (!match) continue;
    if (extras.some((e) => e.name === match.name)) continue;
    extras.push({
      name: match.name,
      calc: match.calc,
      pricePerDay: Number(match.pricePerDay) || 0,
      amount: extraLineTotal(match.calc, Number(match.pricePerDay) || 0, ctx),
    });
  }
  return { extras, extras_total: extras.reduce((s, e) => s + e.amount, 0) };
}