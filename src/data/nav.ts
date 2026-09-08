/** Canonical (Lithuanian) paths — locale prefixing happens in <LocaleLink>. */
export type RoutePath = string;
export type NavLink = { label: string; to: RoutePath };
export type NavEntry = NavLink | { label: string; items: NavLink[] };

const FALLBACK_SITE_URL = "https://example.com";

/** Canonical site origin; override with VITE_SITE_URL when the domain is known. */
export const SITE_URL = (
  import.meta.env?.['VITE_SITE_URL'] || FALLBACK_SITE_URL
).replace(/\/$/, "");

/** Public vacancy site navigation. Labels are translated by the caller. */
export function mainNav(labels: { home: string; units: string; contacts: string }): NavEntry[] {
  return [
    { label: labels.home, to: "/" },
    { label: labels.units, to: "/butai" },
    { label: labels.contacts, to: "/kontaktai" },
  ];
}

export function footerNav(labels: { home: string; units: string; contacts: string }): NavLink[] {
  return [
    { label: labels.home, to: "/" },
    { label: labels.units, to: "/butai" },
    { label: labels.contacts, to: "/kontaktai" },
  ];
}
