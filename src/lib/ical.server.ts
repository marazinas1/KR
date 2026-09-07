import { parseIcal, sourceFromUrl } from "./ical";

export const EXTERNAL_BOOKING_STATUS = "blocked_external";

export type SyncResult = {
  propertyId: string;
  propertyName: string;
  created: number;
  updated: number;
  removed: number;
  error?: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchIcal(url: string): Promise<string> {
  const res = await fetch(normalizeIcalUrl(url), {
    headers: { Accept: "text/calendar, text/plain, */*" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export function normalizeIcalUrl(raw: string): string {
  let cleaned = raw.replace(/\s+/g, "");
  if (!cleaned) return "";
  let prev = "";
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/^(https?|webcal):\/{0,2}/i, "");
  }
  return `https://${cleaned}`;
}

export async function syncPropertyCalendar(property: {
  id: string;
  name: string;
  ical_import_url: string | null;
}): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const base: SyncResult = {
    propertyId: property.id,
    propertyName: property.name,
    created: 0,
    updated: 0,
    removed: 0,
  };

  const url = (property.ical_import_url ?? "").trim();
  if (!url) return { ...base, error: "Nenurodyta iCal nuoroda" };

  try {
    const text = await fetchIcal(url);
    const source = sourceFromUrl(url);
    const from = today();
    const events = parseIcal(text).filter((e) => e.end >= from && e.end > e.start);

    const { data: existingRows, error: exErr } = await supabaseAdmin
      .from("bookings")
      .select("id, external_uid, date_from, date_to, status")
      .eq("property_id", property.id)
      .not("external_uid", "is", null);
    if (exErr) throw new Error(exErr.message);

    const existing = new Map(
      (existingRows ?? []).map((r) => [r.external_uid as string, r]),
    );

    for (const ev of events) {
      const prev = existing.get(ev.uid);
      if (prev) {
        if (
          prev.date_from !== ev.start ||
          prev.date_to !== ev.end ||
          prev.status !== EXTERNAL_BOOKING_STATUS
        ) {
          const { error } = await supabaseAdmin
            .from("bookings")
            .update({
              date_from: ev.start,
              date_to: ev.end,
              status: EXTERNAL_BOOKING_STATUS,
            })
            .eq("id", prev.id);
          if (error) throw new Error(error.message);
          base.updated += 1;
        }
      } else {
        const { error } = await supabaseAdmin.from("bookings").insert({
          booking_number: "",
          property_id: property.id,
          date_from: ev.start,
          date_to: ev.end,
          status: EXTERNAL_BOOKING_STATUS,
          source,
          external_uid: ev.uid,
          external_source: source,
          customer_name: ev.summary || (source === "airbnb" ? "Airbnb" : "Booking.com"),
          total_amount: 0,
          payment_amount: 0,
          note: "Importuota iš išorinio kalendoriaus (iCal)",
        });
        if (error) throw new Error(error.message);
        base.created += 1;
      }
    }

    const seen = new Set(events.map((e) => e.uid));
    const stale = (existingRows ?? []).filter(
      (r) => !seen.has(r.external_uid as string) && r.date_to >= from,
    );
    if (stale.length) {
      const { error } = await supabaseAdmin
        .from("bookings")
        .delete()
        .in(
          "id",
          stale.map((r) => r.id),
        );
      if (error) throw new Error(error.message);
      base.removed = stale.length;
    }

    await supabaseAdmin
      .from("properties")
      .update({
        ical_last_sync_at: new Date().toISOString(),
        ical_last_status: `OK: +${base.created} / ~${base.updated} / -${base.removed}`,
      })
      .eq("id", property.id);

    return base;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nežinoma klaida";
    console.error("[ical-sync]", property.id, message);
    await supabaseAdmin
      .from("properties")
      .update({
        ical_last_sync_at: new Date().toISOString(),
        ical_last_status: `Klaida: ${message}`.slice(0, 300),
      })
      .eq("id", property.id);
    return { ...base, error: message };
  }
}

export async function syncAllCalendars(propertyId?: string): Promise<SyncResult[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin
    .from("properties")
    .select("id, name, ical_import_url")
    .not("ical_import_url", "is", null)
    .neq("ical_import_url", "");
  if (propertyId) q = q.eq("id", propertyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const results: SyncResult[] = [];
  for (const p of data ?? []) {
    results.push(await syncPropertyCalendar(p));
  }
  return results;
}
