/**
 * Public (unauthenticated) reads for the vacancy site.
 *
 * Rule from AGENTS.md 5.7: availability is never a stored flag. Everything the
 * public site shows comes from the `public_vacancies` view, which computes
 * `vacant_now` / `available_from` at read time. The `units` table itself is
 * never queried publicly — it holds internal notes.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type Vacancy = {
  id: string;
  name: string;
  unit_number: string;
  description: string;
  city: string;
  address: string;
  building_name: string | null;
  area_m2: number | null;
  room_count: number;
  floor: number | null;
  monthly_rent: number;
  deposit: number;
  amenities: string[];
  cover_image_url: string;
  image_urls: string[];
  available_from: string | null;
  vacant_now: boolean;
};

function publicClient() {
  // Read env inside the call: Workers inject it per request.
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function toVacancy(row: Record<string, unknown>): Vacancy {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
  return {
    id: String(row["id"] ?? ""),
    name: String(row["name"] ?? ""),
    unit_number: String(row["unit_number"] ?? ""),
    description: String(row["description"] ?? ""),
    city: String(row["city"] ?? ""),
    address: String(row["address"] ?? ""),
    building_name: (row["building_name"] as string | null) ?? null,
    area_m2: (row["area_m2"] as number | null) ?? null,
    room_count: Number(row["room_count"] ?? 1),
    floor: (row["floor"] as number | null) ?? null,
    monthly_rent: Number(row["monthly_rent"] ?? 0),
    deposit: Number(row["deposit"] ?? 0),
    amenities: arr(row["amenities"]),
    cover_image_url: String(row["cover_image_url"] ?? ""),
    image_urls: arr(row["image_urls"]),
    available_from: (row["available_from"] as string | null) ?? null,
    vacant_now: Boolean(row["vacant_now"]),
  };
}

/** Sort: free now first, then the soonest availability date. */
function sortVacancies(rows: Vacancy[]): Vacancy[] {
  return [...rows].sort((a, b) => {
    if (a.vacant_now !== b.vacant_now) return a.vacant_now ? -1 : 1;
    const av = a.available_from ?? "9999-12-31";
    const bv = b.available_from ?? "9999-12-31";
    return av.localeCompare(bv);
  });
}

export const listVacancies = createServerFn({ method: "GET" }).handler(
  async (): Promise<Vacancy[]> => {
    const { data, error } = await publicClient().from("public_vacancies").select("*");
    if (error) throw new Error(error.message);
    return sortVacancies((data ?? []).map((r) => toVacancy(r as Record<string, unknown>)));
  },
);

export const getVacancy = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<Vacancy | null> => {
    const { data: row, error } = await publicClient()
      .from("public_vacancies")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? toVacancy(row as Record<string, unknown>) : null;
  });

export type PublicOrg = {
  displayName: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  city: string;
};

/**
 * White-label details: one name, set once in Settings, used by admin and site.
 * Read server-side with the admin client (org_settings has no anonymous
 * policy — it also holds bank/VAT details); only these safe public columns
 * are ever returned.
 */
export const getPublicOrg = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicOrg> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("org_settings")
      .select("display_name, tagline, brand_logo_url, phone, email, address, city")
      .eq("singleton", true)
      .maybeSingle();
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      displayName: String(row["display_name"] ?? "").trim(),
      tagline: String(row["tagline"] ?? "").trim(),
      logoUrl: String(row["brand_logo_url"] ?? "").trim(),
      phone: String(row["phone"] ?? "").trim(),
      email: String(row["email"] ?? "").trim(),
      address: String(row["address"] ?? "").trim(),
      city: String(row["city"] ?? "").trim(),
    };
  },
);

const inquiryInput = z.object({
  unit_id: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  phone: z.string().max(60).default(""),
  email: z.union([z.literal(""), z.string().email().max(160)]).default(""),
  move_in_date: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .nullable()
    .optional(),
  message: z.string().max(2000).default(""),
  /** Honeypot: real visitors never fill this. */
  company: z.string().max(200).default(""),
});

const RATE_LIMIT_PATH = "public:inquiry";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((d) => inquiryInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // The visitor always sees the same confirmation, so a bot learns nothing.
    if (data.company.trim()) return { ok: true };
    if (!data.phone.trim() && !data.email.trim()) throw new Error("ContactRequired");

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "unknown";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    /*
     * Rate limiting is DURABLE, not in-memory. This app runs on Cloudflare
     * Workers: every invocation may hit a different isolate, so a module-level
     * counter would reset unpredictably and protect nothing. Instead each
     * submission writes a timestamped row into `api_request_log` (path
     * `public:inquiry`) and we count that IP's rows inside the window.
     * No KV and no D1 — the database is the single source of truth.
     */
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("api_request_log")
      .select("id", { count: "exact", head: true })
      .eq("path", RATE_LIMIT_PATH)
      .eq("ip", ip)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT_MAX) return { ok: true };

    const { error } = await supabaseAdmin.from("rental_inquiries").insert({
      unit_id: data.unit_id ?? null,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      move_in_date: data.move_in_date ? data.move_in_date : null,
      message: data.message.trim(),
      status: "new",
      source: "public_site",
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("api_request_log").insert({ path: RATE_LIMIT_PATH, ip });
    return { ok: true };
  });
