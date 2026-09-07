export const PROPERTY_TYPES = [
  { value: "standard", labelKey: "enums.propertyType.standard" },
  { value: "terrace", labelKey: "enums.propertyType.terrace" },
  { value: "cottage", labelKey: "enums.propertyType.cottage" },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];

export const AMENITIES = [
  "wifi",
  "kitchen",
  "parking",
  "air_conditioning",
  "washing_machine",
  "tv",
  "workspace",
  "terrace",
  "balcony",
  "pool",
  "sauna",
  "hot_tub",
  "bbq",
  "pet_friendly",
  "smoke_alarm",
  "first_aid",
  "iron",
  "hair_dryer",
  "coffee_machine",
  "extra_baby_bed",
] as const;

export const AMENITY_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  AMENITIES.map((a) => [a, `enums.amenities.${a}`]),
);

export const ROOM_KINDS = [
  { value: "bedroom_1", label: "Miegamasis 1", labelKey: "enums.roomKind.bedroom_1" },
  { value: "bedroom_2", label: "Miegamasis 2", labelKey: "enums.roomKind.bedroom_2" },
  { value: "bedroom_3", label: "Miegamasis 3", labelKey: "enums.roomKind.bedroom_3" },
  { value: "bedroom_4", label: "Miegamasis 4", labelKey: "enums.roomKind.bedroom_4" },
  { value: "living_room", label: "Svetainė", labelKey: "enums.roomKind.living_room" },
] as const;

export const BED_TYPES = [
  { value: "extra_large_double", label: "Labai didelė dvigulė lova", labelKey: "enums.bedType.extra_large_double" },
  { value: "large_double", label: "Didelė dvigulė lova", labelKey: "enums.bedType.large_double" },
  { value: "double", label: "Standartinė dvigulė lova", labelKey: "enums.bedType.double" },
  { value: "single", label: "Vienvietė lova", labelKey: "enums.bedType.single" },
  { value: "sofa_bed", label: "Miegamoji sofa", labelKey: "enums.bedType.sofa_bed" },
] as const;

export type RoomConfig = { kind: string; beds: number; bedType: string };

export type PriceTier = {
  label: string;
  minNights: number;
  maxNights: number;
  pricePerNight: number;
};

export const EXTRA_CALCS = ["per_person", "per_child", "flat_per_day"] as const;
export type ExtraCalc = (typeof EXTRA_CALCS)[number];

export const EXTRA_CALC_LABEL_KEYS: Record<ExtraCalc, string> = {
  per_person: "enums.extraCalc.per_person",
  per_child: "enums.extraCalc.per_child",
  flat_per_day: "enums.extraCalc.flat_per_day",
};

/**
 * `name` yra paslaugos identifikatorius (saugomas duomenyse ir naudojamas kainai
 * skaičiuoti), todėl jis NEVERČIAMAS — verčiama tik rodoma etiketė `labelKey`.
 */
export const EXTRA_SERVICE_PRESETS: Array<{ name: string; calc: ExtraCalc; labelKey: string }> = [
  { name: "Pusryčiai", calc: "per_person", labelKey: "enums.extraServices.breakfast" },
  { name: "Pietūs", calc: "per_person", labelKey: "enums.extraServices.lunch" },
  { name: "Vakarienė", calc: "per_person", labelKey: "enums.extraServices.dinner" },
  { name: "Vaikiška lovytė", calc: "per_child", labelKey: "enums.extraServices.babyBed" },
  { name: "Pirties nuoma", calc: "flat_per_day", labelKey: "enums.extraServices.sauna" },
  { name: "Kubilo nuoma", calc: "flat_per_day", labelKey: "enums.extraServices.hotTub" },
];

export type ExtraService = {
  name: string;
  calc: ExtraCalc;
  pricePerDay: number;
};

export function calcExtraTotal(
  svc: Pick<ExtraService, "calc" | "pricePerDay">,
  ctx: { adults: number; children: number; childrenUnder3?: number; days: number },
): number {
  const days = Math.max(0, ctx.days);
  const price = Math.max(0, Number(svc.pricePerDay) || 0);
  if (days === 0 || price === 0) return 0;
  const under3 = Math.max(0, ctx.childrenUnder3 ?? 0);
  const paidChildren = Math.max(0, ctx.children - under3);
  if (svc.calc === "per_person") return (ctx.adults + paidChildren) * days * price;
  if (svc.calc === "per_child") return ctx.children * days * price;
  return days * price;
}

export type Rooms = {
  bedrooms?: number;
  living_rooms?: number;
  bathrooms?: number;
  kitchenette?: boolean;
  parking_spot?: boolean;
  notes?: string;
  configs?: RoomConfig[];
};

export type Booking = { from: string; to: string };

export type Property = {
  id: string;
  name: string;
  propertyType: PropertyTypeValue | string;
  description: string;
  address: string;
  city: string;
  country: string;
  locationNote: string;
  doorCode: string;
  lat: number | null;
  lng: number | null;
  areaM2: number | null;
  maxGuests: number;
  beds: number;
  rooms: Rooms;
  amenities: string[];
  pricePerNight: number;
  priceTiers: PriceTier[];
  extraServices: ExtraService[];
  image: string;
  images: string[];
  bookings: Booking[];
  isActive: boolean;
  sortOrder: number;
  status: "active" | "maintenance" | "blocked" | string;
  year: number;
  category: string;
  icalImportUrl: string;
  icalLastSyncAt: string | null;
  icalLastStatus: string | null;
};

export function nightsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function priceForNights(
  p: Pick<Property, "pricePerNight" | "priceTiers">,
  nights: number,
): { tier: PriceTier | null; total: number; pricePerNight: number } {
  const tier =
    p.priceTiers.find((t) => nights >= t.minNights && nights <= t.maxNights) ?? null;
  const nightly = tier ? tier.pricePerNight : p.pricePerNight;
  return { tier, total: nightly * nights, pricePerNight: nightly };
}

export function isPropertyAvailable(p: Property, from: Date, to: Date): boolean {
  return p.bookings.every((b) => {
    const bFrom = new Date(b.from);
    const bTo = new Date(b.to);
    return to < bFrom || from > bTo;
  });
}

/** Grąžina vertimo raktą (arba pačią reikšmę, jei tipas nežinomas). */
export function propertyTypeLabelKey(v: string): string {
  return PROPERTY_TYPES.find((t) => t.value === v)?.labelKey ?? v;
}

export function hasOnlySingleBeds(rooms: Rooms | undefined | null): boolean {
  const configs = rooms?.configs ?? [];
  if (configs.length === 0) return false;
  return configs.every((c) => (Number(c.beds) || 0) === 0 || c.bedType === "single");
}