// Server-only: el. laiškų siuntimo variklis (klientui ir administratoriui).
// Naudoja `content_templates` šablonus, `property_settings` jungiklius ir
// `booking_notifications` žurnalą, kad tas pats laiškas nebūtų siųstas du kartus.

import { DEFAULT_PROPERTY_SETTINGS, SETTINGS_COLUMN_MAP, type PropertySettings } from "./property-settings";
import { ROOM_KINDS, BED_TYPES } from "./properties";
import { toVocative } from "./lt-vocative";
import { resolveFromAddress } from "./email-from";

export type NotificationKind =
  | "booking_confirmation"
  | "booking_change"
  | "booking_cancellation"
  | "checkin_reminder"
  | "review_request";

const SETTINGS_FLAG: Partial<Record<NotificationKind, keyof PropertySettings>> = {
  booking_confirmation: "notifyBookingConfirmation",
  booking_change: "notifyBookingChange",
  booking_cancellation: "notifyCancellationConfirmation",
  checkin_reminder: "notifyCheckinReminder",
  review_request: "notifyReviewRequest",
};

const ADMIN_SUBJECTS: Record<NotificationKind, string> = {
  booking_confirmation: "Nauja rezervacija",
  booking_change: "Rezervacija pakeista",
  booking_cancellation: "Rezervacija atšaukta",
  checkin_reminder: "Artėja svečio atvykimas",
  review_request: "Svečias išvyko",
};

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------- siuntimas ------------------------------- */

/** Įrašo inline stilius, kad pašto klientai (Gmail/Outlook) rodytų tarpus ir sąrašų ženkliukus. */
export function wrapEmailHtml(html: string) {
  if (/<html[\s>]/i.test(html)) return html;

  const styled = (html ?? "")
    .replace(/<p(\s[^>]*)?>/gi, '<p style="margin:0 0 14px 0;line-height:1.6;">')
    .replace(/<ul(\s[^>]*)?>/gi, '<ul style="margin:0 0 14px 0;padding-left:22px;list-style-type:disc;">')
    .replace(/<ol(\s[^>]*)?>/gi, '<ol style="margin:0 0 14px 0;padding-left:22px;list-style-type:decimal;">')
    .replace(/<li(\s[^>]*)?>/gi, '<li style="margin:0 0 6px 0;line-height:1.6;display:list-item;">')
    .replace(/<h([1-3])(\s[^>]*)?>/gi, (_m, lvl: string) => `<h${lvl} style="margin:20px 0 10px 0;line-height:1.3;">`)
    .replace(/<blockquote(\s[^>]*)?>/gi,
      '<blockquote style="margin:0 0 14px 0;padding-left:12px;border-left:3px solid #ddd;color:#555;">');

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f6;">
<div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
${styled}
</div></body></html>`;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY nesukonfigūruotas.");
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY nesukonfigūruotas.");
  const from = resolveFromAddress();

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: wrapEmailHtml(opts.html),
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
  return true;
}

/* -------------------------------- duomenys ------------------------------- */

export async function loadGlobalSettings(): Promise<PropertySettings> {
  const db = await admin();
  const { data: row } = await db
    .from("property_settings")
    .select("*")
    .eq("scope", "global")
    .maybeSingle();
  const out = { ...DEFAULT_PROPERTY_SETTINGS } as Record<string, unknown>;
  if (row) {
    for (const [key, column] of Object.entries(SETTINGS_COLUMN_MAP)) {
      const raw = (row as Record<string, unknown>)[column];
      if (raw === undefined || raw === null) continue;
      out[key] = raw;
    }
  }
  return out as PropertySettings;
}

async function loadTemplate(name: string, lang?: string) {
  const db = await admin();
  const { data } = await db
    .from("content_templates")
    .select("id, subject, content, is_enabled, fields")
    .eq("category", "email")
    .eq("template_name", name)
    .maybeSingle();
  if (data) {
    const tpl = data as {
      id: string;
      subject: string;
      content: string;
      is_enabled: boolean;
      fields: Record<string, string>;
    };
    if (lang) {
      const { loadDefaultLanguage, loadTranslations } = await import("./translations.server");
      const defaultLang = await loadDefaultLanguage();
      if (lang !== defaultLang) {
        const tr = await loadTranslations("content_template", [tpl.id], lang);
        const t = tr[tpl.id];
        // Trūkstamas vertimas -> lieka originalas. Niekada nesiunčiame tuščio laiško.
        if (t?.["subject"]?.trim()) tpl.subject = t["subject"];
        if (t?.["content"]?.trim()) tpl.content = t["content"];
      }
    }
    return tpl;
  }
  // Jei administratorius dar neišsaugojo šablono — naudojamas numatytasis tekstas.
  const { CONTENT_TEMPLATES } = await import("./content-templates");
  const def = CONTENT_TEMPLATES.find((t) => t.category === "email" && t.name === name);
  if (!def?.defaultContent) return null;
  return {
    subject: def.defaultSubject ?? "",
    content: def.defaultContent,
    is_enabled: true,
    fields: {} as Record<string, string>,
  };
}

async function loadGuestInfoFields(name: string): Promise<Record<string, string>> {
  const db = await admin();
  const { data } = await db
    .from("content_templates")
    .select("fields, is_enabled")
    .eq("category", "guest_info")
    .eq("template_name", name)
    .maybeSingle();
  const row = data as { fields: Record<string, string> | null; is_enabled: boolean } | null;
  if (!row || !row.is_enabled) return {};
  return row.fields ?? {};
}

/* ------------------------------- šablonai -------------------------------- */

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n.toFixed(2).replace(".", ",");
}

/** „Miegamasis 1 (didelė dvigulė lova), Svetainė (miegamoji sofa)“ */
function formatRoomNames(rooms: unknown): string {
  const configs = (rooms as { configs?: Array<{ kind?: string; beds?: number; bedType?: string }> } | null)
    ?.configs;
  if (!Array.isArray(configs) || configs.length === 0) return "";
  const kindLabel = new Map<string, string>(ROOM_KINDS.map((r) => [r.value as string, r.label as string]));
  const bedLabel = new Map<string, string>(BED_TYPES.map((b) => [b.value as string, b.label as string]));
  return configs
    .map((c) => {
      const name = kindLabel.get(String(c.kind ?? "")) ?? String(c.kind ?? "");
      if (!name) return "";
      const bed = bedLabel.get(String(c.bedType ?? ""));
      const beds = Number(c.beds) || 0;
      const detail = bed ? `${beds > 1 ? `${beds} × ` : ""}${bed.toLowerCase()}` : "";
      return detail ? `${name} (${detail})` : name;
    })
    .filter(Boolean)
    .join(", ");
}

export function renderTokens(text: string, tokens: Record<string, string>) {
  const rendered = Object.entries(tokens).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text ?? "",
  );
  // Atsarginis variantas: nežinomi kintamieji svečiui nerodomi kaip {{...}}.
  // Kreipinio kintamasis pakeičiamas paprastu vardu, kiti — pašalinami.
  return rendered
    .replace(/\{\{\s*guest_name_vocative\s*\}\}/g, tokens["{{guest_name}}"] ?? "")
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, "");
}

async function buildTokens(
  booking: Record<string, any>,
  settings: PropertySettings,
  lang?: string,
) {
  const db = await admin();
  const { data: prop } = await db
    .from("properties")
    .select("name, door_code, location_note, rooms")
    .eq("id", booking["property_id"])
    .maybeSingle();
  const wifi = await loadGuestInfoFields("wifi");

  // Objekto pavadinimas svečio kalba (jei vertimas suvestas).
  let propertyName = String((prop as any)?.name ?? settings.displayName ?? "");
  const propertyId = String(booking["property_id"] ?? "");
  if (lang && propertyId) {
    try {
      const { loadDefaultLanguage, loadTranslations } = await import("@/lib/translations.server");
      const defaultLang = await loadDefaultLanguage();
      if (lang !== defaultLang) {
        const tr = await loadTranslations("property", [propertyId], lang);
        const translated = tr[propertyId]?.["name"];
        if (translated?.trim()) propertyName = translated.trim();
      }
    } catch (e) {
      console.error("[buildTokens:translate]", e);
    }
  }

  // Durų kodas svečiui atskleidžiamas tik po apmokėjimo/patvirtinimo.
  const status = String(booking["status"] ?? "");
  const paymentStatus = String(booking["payment_status"] ?? "");
  const isPaid =
    status === "confirmed" ||
    status === "completed" ||
    paymentStatus === "paid" ||
    paymentStatus === "partial";

  return {
    "{{guest_name}}": String(booking["customer_name"] ?? ""),
    "{{guest_name_vocative}}": toVocative(String(booking["customer_name"] ?? "")),
    "{{property_name}}": propertyName,
    "{{room_name}}": formatRoomNames((prop as any)?.rooms),
    "{{booking_number}}": String(booking["booking_number"] ?? ""),
    "{{date_from}}": String(booking["date_from"] ?? ""),
    "{{date_to}}": String(booking["date_to"] ?? ""),
    "{{check_in}}": String(booking["check_in_time"] ?? settings.checkinFrom ?? ""),
    "{{check_out}}": String(booking["check_out_time"] ?? settings.checkoutUntil ?? ""),
    "{{check_in_until}}": String(settings.checkinUntil ?? ""),
    "{{quiet_hours_from}}": String(settings.quietHoursFrom ?? ""),
    "{{quiet_hours_to}}": String(settings.quietHoursTo ?? ""),
    "{{door_code}}": isPaid ? String((prop as any)?.door_code ?? "") : "",
    "{{location}}": String((prop as any)?.location_note ?? ""),
    "{{wifi_name}}": wifi["wifiName"] ?? "",
    "{{wifi_password}}": wifi["wifiPassword"] ?? "",
    "{{total_amount}}": money(booking["total_amount"]),
    "{{currency}}": settings.currency || "EUR",
    "{{phone}}": settings.phone || "",
    "{{email}}": settings.email || "",
    "{{review_link}}": String((settings as any).reviewLink ?? ""),
  } as Record<string, string>;
}

/* --------------------------------- žurnalas ------------------------------- */

async function alreadySent(bookingId: string, logKind: string) {
  const db = await admin();
  const { data } = await db
    .from("booking_notifications")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("kind", logKind)
    .maybeSingle();
  return Boolean(data);
}

async function logSend(bookingId: string, logKind: string, recipient: string, status: string, error = "") {
  const db = await admin();
  await db
    .from("booking_notifications")
    .upsert(
      { booking_id: bookingId, kind: logKind, recipient, status, error: error.slice(0, 500) } as never,
      { onConflict: "booking_id,kind" },
    );
}

/* ------------------------------ pagrindinis ------------------------------- */

const ONE_SHOT: NotificationKind[] = [
  "booking_confirmation",
  "booking_cancellation",
  "checkin_reminder",
  "review_request",
];

/**
 * Išsiunčia laišką svečiui pagal „Turinys“ šabloną ir informuoja administratorių.
 * Klaidos niekada nemeta – tik įrašo į žurnalą (rezervacija svarbiau nei laiškas).
 */
export async function notifyBookingEvent(
  bookingId: string,
  kind: NotificationKind,
  opts?: { force?: boolean },
) {
  try {
    const db = await admin();
    const { data: booking } = await db.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!booking) return;

    const settings = await loadGlobalSettings();
    const flag = SETTINGS_FLAG[kind];
    if (!opts?.force && flag && !settings[flag]) return;

    const tokens = await buildTokens(booking as Record<string, any>, settings);
    // Svečio laiško kalba — ta, kuria jis rezervavo.
    const guestLang = String((booking as any).language ?? "").trim() || undefined;
    // Svečiui kintamieji verčiami į jo kalbą; administratoriui lieka originalūs.
    const guestTokens = guestLang
      ? await buildTokens(booking as Record<string, any>, settings, guestLang)
      : tokens;
    const tpl = await loadTemplate(kind, guestLang);

    // 1) Svečiui
    const guestEmail = String((booking as any).customer_email ?? "").trim();
    const guestLogKind = ONE_SHOT.includes(kind) ? kind : `${kind}:${Date.now()}`;
    if (tpl && tpl.is_enabled && guestEmail && !(ONE_SHOT.includes(kind) && (await alreadySent(bookingId, kind)))) {
      try {
        await sendEmail({
          to: guestEmail,
          subject: renderTokens(tpl.subject, guestTokens),
          html: renderTokens(tpl.content, guestTokens),
          ...(settings.email ? { replyTo: settings.email } : {}),
        });
        await logSend(bookingId, guestLogKind, guestEmail, "sent");
      } catch (e) {
        console.error("[notify:guest]", kind, e);
        await logSend(bookingId, guestLogKind, guestEmail, "failed", String(e));
      }
    }

    // 2) Administratoriui
    const adminEmail = (process.env["ADMIN_NOTIFY_EMAIL"] ?? settings.email ?? "").trim();
    const adminLogKind = ONE_SHOT.includes(kind) ? `${kind}:admin` : `${kind}:admin:${Date.now()}`;
    if (adminEmail && !(ONE_SHOT.includes(kind) && (await alreadySent(bookingId, `${kind}:admin`)))) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `[${ADMIN_SUBJECTS[kind]}] ${tokens["{{booking_number}}"]} — ${tokens["{{property_name}}"]}`,
          html: adminHtml(kind, booking as Record<string, any>, tokens),
          ...(guestEmail ? { replyTo: guestEmail } : {}),
        });
        await logSend(bookingId, adminLogKind, adminEmail, "sent");
      } catch (e) {
        console.error("[notify:admin]", kind, e);
        await logSend(bookingId, adminLogKind, adminEmail, "failed", String(e));
      }
    }
  } catch (e) {
    console.error("[notifyBookingEvent]", kind, e);
  }
}

function adminHtml(kind: NotificationKind, booking: Record<string, any>, t: Record<string, string>) {
  const rows: [string, string][] = [
    ["Rezervacija", t["{{booking_number}}"] ?? ""],
    ["Objektas", t["{{property_name}}"] ?? ""],
    ["Svečias", t["{{guest_name}}"] ?? ""],
    ["El. paštas", String(booking["customer_email"] ?? "")],
    ["Telefonas", String(booking["customer_phone"] ?? "")],
    ["Datos", `${t["{{date_from}}"]} → ${t["{{date_to}}"]}`],
    ["Svečių", String(booking["total_guests"] ?? booking["guests"] ?? "")],
    ["Suma", `${t["{{total_amount}}"]} ${t["{{currency}}"]}`],
    ["Statusas", String(booking["status"] ?? "")],
    ["Šaltinis", String(booking["source"] ?? "")],
  ];
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 12px">${ADMIN_SUBJECTS[kind]}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#666;border-bottom:1px solid #eee">${k}</td><td style="border-bottom:1px solid #eee"><strong>${v || "—"}</strong></td></tr>`,
        )
        .join("")}
    </table>
  </div>`;
}

/** Fire-and-forget: nestabdo pagrindinio srauto. */
export function notifyBookingEventAsync(
  bookingId: string,
  kind: NotificationKind,
  opts?: { force?: boolean },
) {
  void notifyBookingEvent(bookingId, kind, opts).catch((e) => console.error("[notifyAsync]", e));
}

/* --------------------------- suplanuoti laiškai --------------------------- */

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3600_000);
}

/** Vietos laiką (pvz. Europe/Vilnius) paverčia į tikrą UTC momentą. */
function zonedToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [h, m] = (timeStr || "15:00").slice(0, 5).split(":");
  const naive = new Date(`${dateStr}T${h}:${m}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(naive).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(
    Number(p["year"]),
    Number(p["month"]) - 1,
    Number(p["day"]),
    Number(p["hour"] === "24" ? "0" : p["hour"]),
    Number(p["minute"]),
    Number(p["second"]),
  );
  const offset = asUtc - naive.getTime();
  return new Date(naive.getTime() - offset);
}

/**
 * Paleidžiama pagal tvarkaraštį: atvykimo priminimai ir atsiliepimo prašymai.
 */
export async function runScheduledNotifications() {
  const settings = await loadGlobalSettings();
  const db = await admin();
  const now = Date.now();
  const result = { checkin_reminder: 0, review_request: 0 };
  const tz = settings.timezone || "Europe/Vilnius";

  if (settings.notifyCheckinReminder) {
    const hours = Number(settings.checkinReminderHoursBefore ?? 24);
    const windowEnd = new Date(now + hours * 3600_000).toISOString().slice(0, 10);
    const today = new Date(now).toISOString().slice(0, 10);
    const { data: rows } = await db
      .from("bookings")
      .select("id, date_from, check_in_time, status")
      .in("status", ["confirmed", "pending", "completed"])
      .gte("date_from", today)
      .lte("date_from", windowEnd);
    for (const r of (rows ?? []) as Array<{ id: string; date_from: string; check_in_time: string | null }>) {
      const target = addHours(
        zonedToUtc(r.date_from, r.check_in_time || settings.checkinFrom || "15:00", tz).toISOString(),
        -hours,
      );
      if (target.getTime() > now) continue;
      if (await alreadySent(r.id, "checkin_reminder")) continue;
      await notifyBookingEvent(r.id, "checkin_reminder");
      result.checkin_reminder += 1;
    }
  }

  if (settings.notifyReviewRequest) {
    const hours = Number(settings.reviewRequestHoursAfter ?? 24);
    const from = new Date(now - (hours + 24 * 14) * 3600_000).toISOString().slice(0, 10);
    const today = new Date(now).toISOString().slice(0, 10);
    const { data: rows } = await db
      .from("bookings")
      .select("id, date_to, check_out_time, status")
      .in("status", ["confirmed", "completed"])
      .gte("date_to", from)
      .lte("date_to", today);
    for (const r of (rows ?? []) as Array<{ id: string; date_to: string; check_out_time: string | null }>) {
      const target = addHours(
        zonedToUtc(r.date_to, r.check_out_time || settings.checkoutUntil || "11:00", tz).toISOString(),
        hours,
      );
      if (target.getTime() > now) continue;
      if (await alreadySent(r.id, "review_request")) continue;
      await notifyBookingEvent(r.id, "review_request");
      result.review_request += 1;
    }
  }

  return result;
}
