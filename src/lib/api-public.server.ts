/** Bendra viešo API duomenų logika (ilgalaikės nuomos laisvi objektai).
 *  Vieši skaitymai eina TIK per public_vacancies vaizdą — units lentelė
 *  anonimams neprieinama (joje yra vidinių pastabų). */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicApiClient() {
  return createClient<Database>(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_PUBLISHABLE_KEY']!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type VacancyRow = Record<string, unknown>;

export function publicUnit(row: VacancyRow) {
  return {
    id: String(row['id']),
    name: (row['name'] as string) ?? "",
    unit_number: (row['unit_number'] as string) ?? "",
    description: (row['description'] as string) ?? "",
    city: (row['city'] as string) ?? "",
    address: (row['address'] as string) ?? "",
    building_name: (row['building_name'] as string) ?? null,
    area_m2: (row['area_m2'] as number) ?? null,
    room_count: (row['room_count'] as number) ?? 1,
    floor: (row['floor'] as number) ?? null,
    monthly_rent: Number(row['monthly_rent'] ?? 0),
    deposit: Number(row['deposit'] ?? 0),
    amenities: (row['amenities'] as string[]) ?? [],
    cover_image_url: (row['cover_image_url'] as string) ?? "",
    image_urls: (row['image_urls'] as string[]) ?? [],
    available_from: (row['available_from'] as string) ?? null,
    vacant_now: Boolean(row['vacant_now']),
  };
}

export const UNIT_PUBLIC_COLUMNS = "*";
