import { getContent } from "@/content";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import type { Property } from "@/lib/rentivo-schemas";

/**
 * Maps an API property onto the shape our cards render.
 * The API owns data; `src/content/lt` owns every word around it.
 */
export type PropertyView = {
  id: string;
  name: string;
  description: string;
  meta: string;
  priceFrom: number | null;
  image: string | null;
  images: string[];
  imageAlt: string;
  amenities: string[];
};

type AmenityDict = Record<string, string>;

const amenityLabelsLt: AmenityDict = {
  wifi: "Belaidis internetas",
  parking: "Automobilių stovėjimo vieta",
  kitchen: "Virtuvėlė",
  tv: "Televizorius",
  sauna: "Sauna",
  hot_tub: "Kubilas",
  terrace: "Terasa",
  air_conditioning: "Oro kondicionierius",
  washing_machine: "Skalbimo mašina",
  coffee: "Kavos aparatas",
  coffee_machine: "Kavos aparatas",
  breakfast: "Pusryčiai",
  pets: "Su augintiniais",
  pet_friendly: "Su augintiniais",
  pool: "Baseinas",
  first_aid: "Pirmosios pagalbos rinkinys",
  extra_baby_bed: "Papildoma vaikiška lovytė",
  balcony: "Balkonas",
  bathroom: "Vonios kambarys",
  workspace: "Darbo vieta",
  smoke_alarm: "Dūmų detektorius",
  "smoke alarm": "Dūmų detektorius",
  heating: "Šildymas",
  hair_dryer: "Plaukų džiovintuvas",
  shower: "Dušas",
  fridge: "Šaldytuvas",
  microwave: "Mikrobangų krosnelė",
  iron: "Lygintuvas",
  towels: "Rankšluosčiai",
  linens: "Patalynė",
  elevator: "Liftas",
  garden: "Sodas",
  bbq: "Kepsninė",
};

/** English labels keyed by the same engine codes. */
const amenityLabelsEn: AmenityDict = {
  wifi: "Wi-Fi",
  parking: "Parking space",
  kitchen: "Kitchenette",
  tv: "TV",
  sauna: "Sauna",
  hot_tub: "Hot tub",
  terrace: "Terrace",
  air_conditioning: "Air conditioning",
  washing_machine: "Washing machine",
  coffee: "Coffee machine",
  coffee_machine: "Coffee machine",
  breakfast: "Breakfast",
  pets: "Pets allowed",
  pet_friendly: "Pets allowed",
  pool: "Pool",
  first_aid: "First aid kit",
  extra_baby_bed: "Extra baby cot",
  balcony: "Balcony",
  bathroom: "Bathroom",
  workspace: "Workspace",
  smoke_alarm: "Smoke alarm",
  "smoke alarm": "Smoke alarm",
  heating: "Heating",
  hair_dryer: "Hair dryer",
  shower: "Shower",
  fridge: "Fridge",
  microwave: "Microwave",
  iron: "Iron",
  towels: "Towels",
  linens: "Bed linen",
  elevator: "Lift",
  garden: "Garden",
  bbq: "Barbecue",
};

const amenityDicts: Record<Locale, AmenityDict> = { lt: amenityLabelsLt, en: amenityLabelsEn };

/** Known amenity label, or null when the engine sends a code we can't translate. */
export function amenityLabel(code: string, locale: Locale = DEFAULT_LOCALE): string | null {
  const key = code.trim().toLowerCase();
  return amenityDicts[locale]?.[key] ?? amenityLabelsLt[key] ?? null;
}

/** Labels for display: unknown codes are dropped, never rendered raw. */
export function knownAmenities(codes: string[], locale: Locale = DEFAULT_LOCALE): string[] {
  return codes
    .map((code) => amenityLabel(code, locale))
    .filter((label): label is string => label !== null);
}

export function propertyMeta(property: Property, locale: Locale = DEFAULT_LOCALE): string {
  const { common } = getContent(locale);
  const parts: string[] = [];
  if (property.area_m2) parts.push(`${property.area_m2} m²`);
  if (property.max_guests) parts.push(`${common.labels.upTo} ${property.max_guests} ${common.labels.guestsLower}`);
  if (property.beds) parts.push(`${property.beds} ${common.labels.bedsLower}`);
  if (property.city) parts.push(property.city);
  return parts.join(" · ");
}

export function toPropertyView(property: Property, locale: Locale = DEFAULT_LOCALE): PropertyView {
  const { common } = getContent(locale);
  return {
    id: property.id,
    name: property.name,
    description: property.description ?? "",
    meta: propertyMeta(property, locale),
    priceFrom: typeof property.price_per_night === "number" ? property.price_per_night : null,
    image: property.cover_image_url ?? property.image_urls[0] ?? null,
    images: dedupeImages([property.cover_image_url, ...property.image_urls]),
    imageAlt: `${property.name} — ${common.brand}`,
    amenities: knownAmenities(property.amenities, locale),
  };
}

/** Ordered, de-duplicated gallery images (cover first). */
function dedupeImages(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function formatPrice(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(".", ",");
}