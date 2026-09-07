/** Locale plumbing: LT lives at the root, EN under /en. Slugs stay Lithuanian. */
export const LOCALES = ["lt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "lt";
export const LOCALE_COOKIE = "dharma_locale";
export const LOCALE_PREFIX = "/en";

export const htmlLang: Record<Locale, string> = { lt: "lt", en: "en" };
export const ogLocale: Record<Locale, string> = { lt: "lt_LT", en: "en_US" };
export const localeName: Record<Locale, string> = { lt: "Lietuvių", en: "English" };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "lt" || value === "en";
}

/** Locale implied by a pathname (`/en/...` → en, everything else → lt). */
export function localeFromPath(pathname: string): Locale {
  return pathname === LOCALE_PREFIX || pathname.startsWith(`${LOCALE_PREFIX}/`) ? "en" : "lt";
}

/** Strips the locale prefix, always returning the canonical Lithuanian path. */
export function stripLocale(pathname: string): string {
  if (pathname === LOCALE_PREFIX) return "/";
  if (pathname.startsWith(`${LOCALE_PREFIX}/`)) return pathname.slice(LOCALE_PREFIX.length) || "/";
  return pathname || "/";
}

/** Adds the locale prefix to a canonical Lithuanian path. */
export function localizePath(path: string, locale: Locale): string {
  const base = stripLocale(path.startsWith("/") ? path : `/${path}`);
  if (locale === "lt") return base;
  return base === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${base}`;
}

/**
 * Maps a router route id (e.g. "/apartamentai/$propertyId") to its counterpart
 * in the target locale. The LT and EN route trees mirror each other, so this is
 * the same prefix rule as localizePath, applied to route patterns.
 */
export function localizeRouteId(routeId: string, locale: Locale): string {
  const id = routeId.replace(/\/$/, "") || "/";
  return localizePath(id, locale);
}
