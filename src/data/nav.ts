/** Canonical (Lithuanian) paths — locale prefixing happens in <LocaleLink>. */
export type RoutePath = string;
export type NavLink = { label: string; to: RoutePath };
export type NavEntry = NavLink | { label: string; items: NavLink[] };

const FALLBACK_SITE_URL = "https://example.com";

/** Canonical site origin; override with VITE_SITE_URL when the domain is known. */
export const SITE_URL = (
  import.meta.env?.['VITE_SITE_URL'] || FALLBACK_SITE_URL
).replace(/\/$/, "");

/**
 * The public vacancy site is built in step 5. Until then the site chrome has a
 * single home link and no client-specific navigation.
 */
export function mainNav(homeLabel: string): NavEntry[] {
  return [{ label: homeLabel, to: "/" }];
}

export function footerNav(homeLabel: string): NavLink[] {
  return [{ label: homeLabel, to: "/" }];
}
