import { queryOptions } from "@tanstack/react-query";

import { getAvailability } from "@/lib/rentivo.functions";

/** Aggregated availability for a date range — cached per range + guest count. */
export function availabilityQuery(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  adults: number,
) {
  return queryOptions({
    queryKey: ["availability", dateFrom ?? null, dateTo ?? null, adults] as const,
    queryFn: () =>
      getAvailability({
        data: { date_from: dateFrom as string, date_to: dateTo as string, adults },
      }),
    enabled: Boolean(dateFrom && dateTo),
    staleTime: 60_000,
  });
}