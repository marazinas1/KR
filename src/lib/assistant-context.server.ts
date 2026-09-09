/**
 * Server-only: read-only context the assistant is allowed to see.
 *
 * Two hard limits:
 *  - No tenant personal data ever leaves this module.
 *  - Bank/company identifiers are described but their values are hidden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { rowToSettings } from "./property-settings-map";
import type { PropertySettings } from "./property-settings";
import type { AssistantLang } from "./assistant-knowledge";

type Db = SupabaseClient<Database>;

/** Values the assistant must never repeat, even to an owner. */
const HIDDEN: Array<keyof PropertySettings> = [
  "iban",
  "bankName",
  "companyCode",
  "companyVatCode",
  "companyAddress",
];

export async function loadSettingsForAssistant(db: Db): Promise<PropertySettings> {
  const { data } = await db.from("org_settings").select("*").eq("singleton", true).maybeSingle();
  return rowToSettings((data as Record<string, unknown> | null) ?? null);
}

export function buildSettingsKnowledge(lang: AssistantLang, s: PropertySettings) {
  const en = lang === "en";
  const hidden = en ? "(hidden — visible in Settings)" : "(paslėpta – matoma Nustatymuose)";
  const yes = en ? "yes" : "taip";
  const no = en ? "no" : "ne";
  const b = (v: unknown) => (v ? yes : no);

  const lines = [
    `${en ? "Display name" : "Pavadinimas"}: ${s.displayName || "—"}`,
    `${en ? "Tagline" : "Paantraštė"}: ${s.tagline || "—"}`,
    `${en ? "City" : "Miestas"}: ${s.city || "—"}`,
    `${en ? "Currency" : "Valiuta"}: ${s.currency}`,
    `${en ? "Default language" : "Numatytoji kalba"}: ${s.defaultLanguage}`,
    `${en ? "Payment due day" : "Mokėjimo diena"}: ${s.paymentDueDay}`,
    `${en ? "Default notice period (days)" : "Numatytas įspėjimo terminas (d.)"}: ${s.defaultNoticeDays}`,
    `${en ? "Reading window" : "Rodmenų langas"}: ${s.readingWindowFromDay}–${s.readingWindowToDay}`,
    `${en ? "Meter photo required" : "Skaitiklio nuotrauka privaloma"}: ${b(s.requireMeterPhoto)}`,
    `${en ? "VAT rate" : "PVM tarifas"}: ${s.vatRate}%`,
    `${en ? "Invoice series" : "Sąskaitų serija"}: ${s.invoiceSeries || "—"}, ${en ? "next number" : "kitas numeris"}: ${s.invoiceNextNumber}`,
    `${en ? "Notifications" : "Pranešimai"}: ${en ? "readings" : "rodmenys"} ${b(s.notifyReadingReminder)}, ${en ? "lease expiry" : "sutarčių pabaiga"} ${b(s.notifyLeaseExpiring)}, ${en ? "overdue" : "vėluojantys mokėjimai"} ${b(s.notifyPaymentOverdue)}, ${en ? "issues" : "gedimai"} ${b(s.notifyIssueUpdate)}, ${en ? "inquiries" : "užklausos"} ${b(s.notifyNewInquiry)}`,
    `${en ? "Own logo uploaded" : "Įkeltas logotipas"}: ${b(s.brandLogoUrl)}`,
  ];
  for (const key of HIDDEN) lines.push(`${key}: ${hidden}`);
  return lines.join("\n");
}

/** Units only — no tenants, no leases, no people. */
export async function buildUnitsSummary(db: Db, lang: AssistantLang) {
  const en = lang === "en";
  const [{ data: units }, { data: buildings }] = await Promise.all([
    db
      .from("units")
      .select("id, name, building_id, status, monthly_rent, is_listed, is_active, photos")
      .order("name", { ascending: true })
      .limit(200),
    db.from("buildings").select("id, name"),
  ]);
  if (!units || units.length === 0) {
    return en ? "No units created yet." : "Butų dar nesukurta.";
  }
  const buildingName = new Map((buildings ?? []).map((b) => [b.id, b.name]));
  const lines = units.map((u) => {
    const photos = Array.isArray(u.photos) ? u.photos.length : 0;
    const parts = [
      u.name,
      buildingName.get(u.building_id ?? "") ?? (en ? "no building" : "be pastato"),
      `${en ? "status" : "būsena"}: ${u.status}`,
      `${en ? "rent" : "nuoma"}: ${u.monthly_rent ?? "—"}`,
      `${en ? "listed" : "viešinamas"}: ${u.is_listed ? (en ? "yes" : "taip") : en ? "no" : "ne"}`,
      `${en ? "photos" : "nuotraukų"}: ${photos}`,
      u.is_active ? "" : en ? "inactive" : "neaktyvus",
    ].filter(Boolean);
    return `- ${parts.join(", ")}`;
  });
  return lines.join("\n");
}
