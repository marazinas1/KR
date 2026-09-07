import { queryOptions } from "@tanstack/react-query";

import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import { listProperties } from "@/lib/rentivo.functions";

/** Shared across the home page and /apartamentai — one cache entry per locale. */
export function propertiesQueryFor(locale: Locale = DEFAULT_LOCALE) {
  return queryOptions({
    queryKey: ["properties", locale] as const,
    queryFn: () => listProperties({ data: { language: locale } }),
    staleTime: 60_000,
  });
}

/** Lithuanian list — kept for callers that have no locale in scope. */
export const propertiesQuery = propertiesQueryFor(DEFAULT_LOCALE);

/** Max cards shown on the landing page before we link out to /apartamentai. */
export const HOME_STAYS_LIMIT = 3;
