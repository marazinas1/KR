import { recalcExtras, type BookingExtra, type ExtraCalcKind } from "./booking-extras";

export type PriceTierLike = { minNights: number; maxNights: number; pricePerNight: number };
export type ExtraServiceLike = { name: string; calc: ExtraCalcKind; pricePerDay: number };

export function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Naktinė kaina pagal sezoninius įkainius (pagal naktų skaičių). */
export function nightlyRateFor(
  pricePerNight: number,
  tiers: PriceTierLike[],
  nights: number,
): number {
  const tier = (tiers ?? []).find(
    (t) => nights >= Number(t.minNights) && nights <= Number(t.maxNights),
  );
  return Number(tier?.pricePerNight ?? pricePerNight) || 0;
}

export type QuoteInput = {
  pricePerNight: number;
  priceTiers: PriceTierLike[];
  extraServices: ExtraServiceLike[];
  dateFrom: string;
  dateTo: string;
  adults: number;
  children: number;
  infants: number;
  selectedExtras: Array<{ name: string }>;
};

export type QuoteResult = {
  nights: number;
  nightly_rate: number;
  stay_total: number;
  extras: BookingExtra[];
  extras_total: number;
  total: number;
};

/** Vienas kainos skaičiavimo šaltinis: quote ir rezervacijos API. */
export function computeQuote(input: QuoteInput): QuoteResult {
  const nights = nightsBetween(input.dateFrom, input.dateTo);
  const nightlyRate = nightlyRateFor(input.pricePerNight, input.priceTiers ?? [], nights);
  const stayTotal = nightlyRate * nights;
  const { extras, extras_total } = recalcExtras(
    input.extraServices ?? [],
    input.selectedExtras ?? [],
    {
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      days: nights,
    },
  );
  return {
    nights,
    nightly_rate: nightlyRate,
    stay_total: stayTotal,
    extras,
    extras_total,
    total: stayTotal + extras_total,
  };
}