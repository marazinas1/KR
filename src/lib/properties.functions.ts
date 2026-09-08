import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Property, PriceTier, Rooms, Booking, ExtraService } from "./properties";
import type { Database } from "@/integrations/supabase/types";

/** Defense-in-depth: programos lygmens administratoriaus patikra (šalia RLS). */
const assertAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "manager",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Neturite administratoriaus teisių.");
};

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
/** Anon reads: no door_code, no internal notes. */
const PROPERTY_ANON_COLUMNS =
  "id, name, category, year, price_per_night, cover_image_url, image_urls, price_tiers, is_active, sort_order, created_at, updated_at, status, property_type, description, address, city, country, lat, lng, area_m2, max_guests, beds, rooms, amenities, extra_services";
/** Authenticated admin reads: internal fields included (still no door_code). */
const PROPERTY_PUBLIC_COLUMNS = `${PROPERTY_ANON_COLUMNS}, location_note`;
type PublicPropertyRow = Omit<
  PropertyRow,
  "door_code" | "features" | "ical_import_url" | "ical_last_status" | "ical_last_sync_at"
> & {
  door_code?: string | null;
  features?: PropertyRow["features"];
};
type BookingRow = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  "property_id" | "date_from" | "date_to"
>;

function mapProperty(row: PublicPropertyRow, bookings: BookingRow[] = []): Property {
  return {
    id: row.id,
    name: row.name,
    propertyType: row.property_type,
    description: row.description ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    country: row.country ?? "LT",
    locationNote: row.location_note ?? "",
    doorCode: row.door_code ?? "",
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    areaM2: row.area_m2 ?? null,
    maxGuests: row.max_guests,
    beds: row.beds,
    rooms: (row.rooms as unknown as Rooms) ?? {},
    amenities: (row.amenities as unknown as string[]) ?? [],
    pricePerNight: Number(row.price_per_night),
    priceTiers: (row.price_tiers as unknown as PriceTier[]) ?? [],
    extraServices: (row.extra_services as unknown as ExtraService[]) ?? [],
    image: row.cover_image_url,
    images: (row.image_urls as unknown as string[]) ?? [],
    bookings: bookings.map<Booking>((b) => ({ from: b.date_from, to: b.date_to })),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    status: row.status,
    year: row.year,
    category: row.category ?? "",
  };
}

export const listActiveProperties = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_ANON_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[listActiveProperties]", error.message);
    throw new Error("Nepavyko įkelti objektų.");
  }

  let bookings: BookingRow[] = [];
  if ((data ?? []).length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b, error: bErr } = await supabaseAdmin.rpc("get_active_booked_dates");
    if (bErr) {
      console.error("[listActiveProperties:booked]", bErr.message);
      throw new Error("Nepavyko įkelti užimtumo duomenų.");
    }
    bookings = (b ?? []) as BookingRow[];
  }
  const byProp = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const list = byProp.get(b.property_id) ?? [];
    list.push(b);
    byProp.set(b.property_id, list);
  }
  return (data ?? []).map((r) =>
    mapProperty(r as unknown as PublicPropertyRow, byProp.get(r.id) ?? []),
  );
});

export const getPropertyById = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: prop, error } = await supabase
      .from("properties")
      .select(PROPERTY_ANON_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getPropertyById]", error.message);
      throw new Error("Nepavyko įkelti objekto.");
    }
    if (!prop) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bookings, error: bErr } = await supabaseAdmin.rpc("get_property_booked_dates", {
      _property_id: data.id,
    });
    if (bErr) {
      console.error("[getPropertyById:booked]", bErr.message);
      throw new Error("Nepavyko įkelti užimtumo duomenų.");
    }
    const rows =
      (bookings ?? []).map((b) => ({
        property_id: data.id,
        date_from: b.date_from,
        date_to: b.date_to,
      })) ?? [];
    return mapProperty(prop as unknown as PublicPropertyRow, rows);
  });

/** Admin-only read that includes door_code (used by the edit form). */
export const getPropertyForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: prop, error } = await context.supabase
      .from("properties")
      .select(PROPERTY_PUBLIC_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getPropertyForEdit]", error.message);
      throw new Error("Nepavyko įkelti objekto.");
    }
    if (!prop) return null;
    const { data: doorCode } = await context.supabase.rpc("admin_get_door_code", {
      _property_id: data.id,
    });
    return mapProperty({
      ...(prop as unknown as PublicPropertyRow),
      door_code: (doorCode as string | null) ?? null,
    });
  });

export const listAllProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_PUBLIC_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapProperty(r));
  });

const propertyInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  propertyType: z.string().trim().min(1).max(50),
  description: z.string().max(5000).default(""),
  address: z.string().trim().max(300).default(""),
  city: z.string().trim().max(100).default(""),
  country: z.string().trim().max(3).default("LT"),
  locationNote: z.string().trim().max(2000).default(""),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  areaM2: z.number().int().min(0).max(100000).nullable().optional(),
  maxGuests: z.number().int().min(1).max(50),
  beds: z.number().int().min(1).max(50),
  rooms: z
    .object({
      bedrooms: z.number().int().min(0).max(50).optional(),
      living_rooms: z.number().int().min(0).max(20).optional(),
      bathrooms: z.number().int().min(0).max(20).optional(),
      kitchenette: z.boolean().optional(),
      parking_spot: z.boolean().optional(),
      notes: z.string().max(500).optional(),
      configs: z
        .array(
          z.object({
            kind: z.string().min(1).max(50),
            beds: z.number().int().min(1).max(20),
            bedType: z.string().min(1).max(50),
          }),
        )
        .max(20)
        .optional(),
    })
    .default({}),
  amenities: z.array(z.string().min(1).max(50)).max(50).default([]),
  pricePerNight: z.number().positive().max(100000),
  priceTiers: z
    .array(
      z.object({
        label: z.string().trim().max(100).default(""),
        minNights: z.number().int().min(1),
        maxNights: z.number().int().min(1),
        pricePerNight: z.number().min(0),
      }),
    )
    .max(20)
    .default([]),
  extraServices: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        calc: z.enum(["per_person", "per_child", "flat_per_day"]),
        pricePerDay: z.number().min(0).max(100000),
      }),
    )
    .max(20)
    .default([]),
  coverImageUrl: z.string().trim().max(2000).default(""),
  imageUrls: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  status: z.enum(["active", "maintenance", "blocked"]).default("active"),
  year: z.number().int().min(1800).max(2100).default(new Date().getFullYear()),
  category: z.string().max(100).default(""),
  doorCode: z.string().trim().max(100).default(""),
});

function toRow(input: z.infer<typeof propertyInputSchema>) {
  return {
    name: input.name,
    property_type: input.propertyType,
    description: input.description,
    address: input.address,
    city: input.city,
    country: input.country,
    location_note: input.locationNote,
    door_code: input.doorCode || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    area_m2: input.areaM2 ?? null,
    max_guests: input.maxGuests,
    beds: input.beds,
    rooms: input.rooms,
    amenities: input.amenities,
    price_per_night: input.pricePerNight,
    price_tiers: input.priceTiers,
    extra_services: input.extraServices,
    cover_image_url: input.coverImageUrl,
    image_urls: input.imageUrls,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    status: input.status,
    year: input.year,
    category: input.category || input.propertyType,
  };
}

export const createProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => propertyInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("properties")
      .insert(toRow(data))
      .select(PROPERTY_PUBLIC_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return mapProperty(row);
  });

export const updateProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), patch: propertyInputSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("properties")
      .update(toRow(data.patch))
      .eq("id", data.id)
      .select(PROPERTY_PUBLIC_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return mapProperty(row);
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("properties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const roles = (data ?? []).map((r) => String(r.role));
    // Hierarchy: developer > owner > manager > tenant.
    const isDeveloper = roles.includes("developer");
    const isOwner = isDeveloper || roles.includes("owner");
    const isManager = isOwner || roles.includes("manager");
    const isTenant = !isManager && roles.includes("tenant");

    // Highest role in the hierarchy, used for labels and menu gating.
    const role = isDeveloper
      ? "developer"
      : roles.includes("owner")
        ? "owner"
        : isManager
          ? "manager"
          : isTenant
            ? "tenant"
            : "none";

    const email = (claims as { email?: string } | null)?.email ?? "";

    return { userId, email, role, roles, isDeveloper, isOwner, isManager, isTenant };
  });


// Self-serve admin bootstrap was removed: it allowed any registered user to
// escalate to admin. Admin roles are granted directly in the database only.