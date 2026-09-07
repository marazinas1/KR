import { useQuery } from "@tanstack/react-query";

import { useLocale } from "@/content";
import { propertiesQueryFor } from "@/lib/property-queries";
import type { Property } from "@/lib/rentivo-schemas";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** URL-safe slug from Lithuanian text (diacritics stripped). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Stable id <-> slug map for the whole property list. Rooms whose names
 * slugify identically get a short id suffix so URLs stay unique.
 */
export function buildSlugIndex(properties: Property[]): {
  byId: Map<string, string>;
  bySlug: Map<string, string>;
} {
  const counts = new Map<string, number>();
  for (const property of properties) {
    const base = slugify(property.name) || "apartamentai";
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }

  const byId = new Map<string, string>();
  const bySlug = new Map<string, string>();
  for (const property of properties) {
    const base = slugify(property.name) || "apartamentai";
    const slug = (counts.get(base) ?? 0) > 1 ? `${base}-${property.id.slice(0, 6)}` : base;
    byId.set(property.id, slug);
    bySlug.set(slug, property.id);
  }
  return { byId, bySlug };
}

export function slugForId(properties: Property[], id: string): string {
  return buildSlugIndex(properties).byId.get(id) ?? id;
}

export function idForSlug(properties: Property[], slug: string): string | undefined {
  if (isUuid(slug)) return slug;
  return buildSlugIndex(properties).bySlug.get(slug.toLowerCase());
}

/** Cache-only lookup for cards; falls back to the raw id before data lands. */
export function usePropertySlug(): (id: string) => string {
  const { data } = useQuery(propertiesQueryFor(useLocale()));
  const index = buildSlugIndex(data ?? []);
  return (id: string) => index.byId.get(id) ?? id;
}