import { getContent } from "@/content";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import type { Property } from "@/lib/rentivo-schemas";
import { slugify } from "@/lib/property-slug";

/**
 * Category grouping for the home page and the /apartamentai filter.
 * The API exposes `property_type` per property; until the backend fills it in we
 * degrade to the flat, one-card-per-property listing.
 */
export type CategoryGroup = {
  code: string;
  label: string;
  properties: Property[];
  priceFrom: number | null;
  image: string | null;
  imageAlt: string;
  count: number;
  areaMin: number | null;
  areaMax: number | null;
  maxGuests: number | null;
};

const KNOWN_ORDER = ["standard", "terrace", "cottage"] as const;

export function normalizeCategory(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function categoryLabel(code: string, locale: Locale = DEFAULT_LOCALE): string {
  const key = normalizeCategory(code);
  const known = (getContent(locale).common.categories as Record<string, string>)[key];
  if (known) return known;
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Lithuanian plural for "variantas" (option). */
export function optionsLabel(count: number, locale: Locale = DEFAULT_LOCALE): string {
  const { common } = getContent(locale);
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return `${count} ${common.categoryCard.optionsOne}`;
  if (last === 0 || (lastTwo >= 11 && lastTwo <= 19)) {
    return `${count} ${common.categoryCard.optionsMany}`;
  }
  return `${count} ${common.categoryCard.optionsFew}`;
}

function priceOf(property: Property): number | null {
  return typeof property.price_per_night === "number" ? property.price_per_night : null;
}

function imageOf(property: Property): string | null {
  return property.cover_image_url ?? property.image_urls[0] ?? null;
}

export function distinctCategories(properties: Property[]): string[] {
  const codes = new Set<string>();
  for (const property of properties) {
    const code = normalizeCategory(property.property_type);
    if (code) codes.add(code);
  }
  return [...codes];
}

/** Grouping activates once at least two distinct property_type values exist. */
export function isGrouped(properties: Property[]): boolean {
  return distinctCategories(properties).length >= 2;
}

/** Properties the backend hasn't categorised yet — shown after the category cards. */
export function uncategorized(properties: Property[]): Property[] {
  return properties.filter((property) => !normalizeCategory(property.property_type));
}

/** Compact facts line for a category card: "18–35 m² · iki 4 svečių". */
export function categoryFacts(group: CategoryGroup, locale: Locale = DEFAULT_LOCALE): string {
  const { common } = getContent(locale);
  const parts: string[] = [];
  if (group.areaMin !== null && group.areaMax !== null) {
    parts.push(
      group.areaMin === group.areaMax
        ? `${group.areaMin} m²`
        : `${group.areaMin}–${group.areaMax} m²`,
    );
  }
  if (group.maxGuests !== null) {
    parts.push(`${common.labels.upTo} ${group.maxGuests} ${common.labels.guestsLower}`);
  }
  return parts.join(" · ");
}

export function groupByCategory(
  properties: Property[],
  locale: Locale = DEFAULT_LOCALE,
): CategoryGroup[] {
  const { common } = getContent(locale);
  const buckets = new Map<string, Property[]>();
  for (const property of properties) {
    const code = normalizeCategory(property.property_type);
    if (!code) continue;
    const bucket = buckets.get(code);
    if (bucket) bucket.push(property);
    else buckets.set(code, [property]);
  }

  const codes = [...buckets.keys()].sort((a, b) => {
    const ai = KNOWN_ORDER.indexOf(a as (typeof KNOWN_ORDER)[number]);
    const bi = KNOWN_ORDER.indexOf(b as (typeof KNOWN_ORDER)[number]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return codes.map((code) => {
    const items = buckets.get(code) ?? [];
    const priced = items
      .filter((item) => priceOf(item) !== null)
      .sort((a, b) => (priceOf(a) as number) - (priceOf(b) as number));
    const cheapest = priced[0];
    const label = categoryLabel(code, locale);
    const image =
      (cheapest ? imageOf(cheapest) : null) ??
      items.map(imageOf).find((url): url is string => Boolean(url)) ??
      null;
    const areas = items
      .map((item) => item.area_m2)
      .filter((value): value is number => typeof value === "number" && value > 0);
    const guests = items
      .map((item) => item.max_guests)
      .filter((value): value is number => typeof value === "number" && value > 0);

    return {
      code,
      label,
      properties: items,
      priceFrom: cheapest ? priceOf(cheapest) : null,
      image,
      imageAlt: `${label} — ${common.brand}`,
      count: items.length,
      areaMin: areas.length > 0 ? Math.min(...areas) : null,
      areaMax: areas.length > 0 ? Math.max(...areas) : null,
      maxGuests: guests.length > 0 ? Math.max(...guests) : null,
    };
  });
}

/** Filters a list to a category; unknown or unmatched codes return everything. */
export function filterByCategory(properties: Property[], code: string | undefined): Property[] {
  const key = normalizeCategory(code);
  if (!key) return properties;
  const matched = properties.filter((property) => normalizeCategory(property.property_type) === key);
  return matched.length > 0 ? matched : properties;
}

export function hasCategory(properties: Property[], code: string | undefined): boolean {
  const key = normalizeCategory(code);
  if (!key) return false;
  return properties.some((property) => normalizeCategory(property.property_type) === key);
}

/** Pretty URL segment for a category, derived from its Lithuanian label. */
/** Slugs stay Lithuanian in every locale so both language trees share URLs. */
export function categorySlug(code: string): string {
  const key = normalizeCategory(code);
  return slugify(categoryLabel(key, "lt")) || slugify(key) || "apartamentai";
}

/** Resolves a URL slug back to the raw property_type code found in the data. */
export function codeForSlug(properties: Property[], slug: string): string | undefined {
  const target = slug.toLowerCase();
  const known = Object.keys(getContent("lt").common.categories).find(
    (code) => categorySlug(code) === target,
  );
  const codes = distinctCategories(properties);
  return (
    codes.find((code) => categorySlug(code) === target) ??
    (known && codes.includes(known) ? known : undefined) ??
    known
  );
}