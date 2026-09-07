import {
  availabilityInputSchema,
  type AvailabilityGroup,
  type AvailabilitySummary,
} from "@/lib/availability-schemas";
import { normalizeCategory } from "@/lib/property-category";
import { fetchProperties, fetchProperty, fetchQuote } from "@/lib/rentivo-api.server";

/** Days between two YYYY-MM-DD dates. */
function nightsBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function previousDay(date: string): string {
  const time = Date.parse(`${date}T00:00:00Z`) - 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}

/** Nights are [from, to-1]; occupied ranges are inclusive on both ends. */
function overlaps(from: string, to: string, occFrom: string, occTo: string): boolean {
  const lastNight = previousDay(to);
  return from <= occTo.slice(0, 10) && lastNight >= occFrom.slice(0, 10);
}

/** Runs tasks with a small concurrency cap so the Worker isn't flooded. */
async function inBatches<T, R>(
  items: T[],
  size: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    results.push(...(await Promise.all(slice.map(task))));
  }
  return results;
}

export async function computeAvailability(input: unknown): Promise<AvailabilitySummary> {
  const { date_from, date_to, adults } = availabilityInputSchema.parse(input);
  const nights = nightsBetween(date_from, date_to);
  const properties = await fetchProperties();

  const checked = await inBatches(properties, 6, async (property) => {
    try {
      const detail = await fetchProperty(property.id);
      const busy = detail.occupied.some((range) =>
        overlaps(date_from, date_to, range.date_from, range.date_to),
      );
      return { property, free: !busy };
    } catch {
      // A single failing detail call must not hide the whole type.
      return { property, free: false };
    }
  });

  const freeEntries = checked.filter((entry) => entry.free);

  const quoted = await inBatches(freeEntries, 6, async (entry) => {
    try {
      const quote = await fetchQuote({
        property_id: entry.property.id,
        date_from,
        date_to,
        adults,
      });
      if (quote.available === false) return { entry, total: null, currency: null, free: false };
      return { entry, total: quote.total, currency: quote.currency, free: true };
    } catch {
      return { entry, total: null, currency: null, free: true };
    }
  });

  const free = quoted.filter((row) => row.free);

  const totals = new Map<string, number>();
  for (const property of properties) {
    const code = normalizeCategory(property.property_type);
    if (!code) continue;
    totals.set(code, (totals.get(code) ?? 0) + 1);
  }

  const groups: AvailabilityGroup[] = [...totals.entries()].map(([code, total_count]) => {
    const rows = free.filter(
      (row) => normalizeCategory(row.entry.property.property_type) === code,
    );
    const prices = rows
      .map((row) => row.total)
      .filter((value): value is number => typeof value === "number");
    return {
      code,
      free_count: rows.length,
      total_count,
      price_from: prices.length > 0 ? Math.min(...prices) : null,
      currency: rows.find((row) => row.currency)?.currency ?? null,
    };
  });

  return {
    date_from,
    date_to,
    nights,
    groups,
    free_ids: free.map((row) => row.entry.property.id),
    free_units: free.map((row) => ({
      id: row.entry.property.id,
      total: row.total,
      currency: row.currency,
    })),
  };
}