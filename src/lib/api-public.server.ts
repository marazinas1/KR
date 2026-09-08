/** Bendra viešo API duomenų logika (ilgalaikės nuomos objektai). */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicApiClient() {
  return createClient<Database>(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_PUBLISHABLE_KEY']!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type UnitRow = Database["public"]["Tables"]["units"]["Row"];

/** Tik viešai saugūs laukai — be vidinių pastabų ir be nuomininkų duomenų. */
export function publicUnit(row: UnitRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    city: row.city ?? "",
    country: row.country ?? "LT",
    address: row.address ?? "",
    area_m2: row.area_m2 ?? null,
    floor: row.floor ?? null,
    room_count: row.room_count ?? 1,
    amenities: (row.amenities as unknown as string[]) ?? [],
    monthly_rent: Number(row.monthly_rent ?? 0),
    deposit: Number(row.deposit ?? 0),
    status: row.status,
    cover_image_url: row.cover_image_url,
    image_urls: (row.image_urls as unknown as string[]) ?? [],
  };
}

export const UNIT_PUBLIC_COLUMNS =
  "id, name, description, city, country, address, area_m2, floor, room_count, amenities, monthly_rent, deposit, status, cover_image_url, image_urls, is_listed, is_active, sort_order, created_at";
