/** Bendra viešo API duomenų logika (objektai, užimtumas, kainos). */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PriceTierLike, ExtraServiceLike } from "./booking-pricing";

export function publicApiClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

/** Tik viešai saugūs laukai — be vidinių pastabų, iCal nuorodų ir pan. */
export function publicProperty(row: PropertyRow) {
  return {
    id: row.id,
    name: row.name,
    property_type: row.property_type,
    description: row.description ?? "",
    city: row.city ?? "",
    country: row.country ?? "LT",
    address: row.address ?? "",
    area_m2: row.area_m2 ?? null,
    max_guests: row.max_guests,
    beds: row.beds,
    rooms: row.rooms ?? {},
    amenities: (row.amenities as unknown as string[]) ?? [],
    price_per_night: Number(row.price_per_night),
    price_tiers: (row.price_tiers as unknown as PriceTierLike[]) ?? [],
    extra_services: (row.extra_services as unknown as ExtraServiceLike[]) ?? [],
    cover_image_url: row.cover_image_url,
    image_urls: (row.image_urls as unknown as string[]) ?? [],
    category: row.category ?? "",
  };
}

export const PROPERTY_PUBLIC_COLUMNS =
  "id, name, property_type, description, city, country, address, area_m2, max_guests, beds, rooms, amenities, price_per_night, price_tiers, extra_services, cover_image_url, image_urls, category, is_active, sort_order, created_at";

export type OccupiedRange = { date_from: string; date_to: string };

export async function occupiedRangesFor(propertyId: string): Promise<OccupiedRange[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_property_booked_dates", {
    _property_id: propertyId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ date_from: r.date_from, date_to: r.date_to }));
}

export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom < bTo && aTo > bFrom;
}