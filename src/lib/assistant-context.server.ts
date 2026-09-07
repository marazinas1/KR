// Server-only: surenka nejautrų kontekstą AI pagalbininkui (nustatymų laukai su
// paaiškinimais ir dabartinėmis reikšmėmis, objektų santrauka).
import lt from "@/i18n/locales/lt.json";
import en from "@/i18n/locales/en.json";
import {
  SETTINGS_SECTIONS,
  type PropertySettings,
} from "./property-settings";
import { rowToSettings } from "./property-settings-map";
import type { AssistantLang } from "./assistant-knowledge";

type AnySupabase = {
  from: (table: string) => any;
};

/** Laukai, kurių reikšmės į AI kontekstą NEPERDUODAMOS (paaiškinimas lieka). */
const SENSITIVE_FIELDS = new Set<keyof PropertySettings>([
  "iban",
  "bankName",
  "companyCode",
  "companyVatCode",
  "companyAddress",
  "invoiceLogoUrl",
  "brandLogoUrl",
  "brandEmailLogoUrl",
  "brandPdfLogoUrl",
  "reviewLink",
  "lat",
  "lng",
]);

function lookup(dict: unknown, path: string): string | undefined {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function tr(lang: AssistantLang, key: string): string {
  const dict = lang === "en" ? en : lt;
  return lookup(dict, key) ?? lookup(lt, key) ?? key;
}

function formatValue(
  lang: AssistantLang,
  field: (typeof SETTINGS_SECTIONS)[number]["fields"][number],
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") return lang === "en" ? "(empty)" : "(tuščia)";
  if (typeof value === "boolean") {
    return value ? (lang === "en" ? "ON" : "ĮJUNGTA") : lang === "en" ? "OFF" : "IŠJUNGTA";
  }
  const optionLabel = (v: string) => {
    const opt = field.options?.find((o) => o.value === v);
    if (!opt) return v;
    return opt.labelKey ? tr(lang, opt.labelKey) : (opt.label ?? v);
  };
  if (Array.isArray(value)) return value.map((v) => optionLabel(String(v))).join(", ") || "—";
  if (field.options) return optionLabel(String(value));
  const unit = field.unitKey ? ` ${tr(lang, field.unitKey)}` : "";
  return `${String(value)}${unit}`;
}

/** Nustatymų skiltys → laukai (pavadinimas, paaiškinimas, dabartinė reikšmė). */
export function buildSettingsKnowledge(lang: AssistantLang, settings: PropertySettings): string {
  const lines: string[] = [];
  for (const section of SETTINGS_SECTIONS) {
    lines.push(`## ${tr(lang, section.titleKey)} (settings section "${section.id}")`);
    lines.push(tr(lang, section.descriptionKey));
    for (const f of section.fields) {
      const label = tr(lang, f.labelKey);
      const help = f.helpKey ? ` — ${tr(lang, f.helpKey)}` : "";
      const value = SENSITIVE_FIELDS.has(f.name)
        ? lang === "en"
          ? "(hidden)"
          : "(paslėpta)"
        : formatValue(lang, f, settings[f.name]);
      const opts =
        f.options && f.type !== "checkboxGroup"
          ? ` [${lang === "en" ? "options" : "pasirinkimai"}: ${f.options
              .map((o) => (o.labelKey ? tr(lang, o.labelKey) : (o.label ?? o.value)))
              .join(" / ")}]`
          : "";
      lines.push(`- ${label}${help}${opts}. ${lang === "en" ? "Current" : "Dabar"}: ${value}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function loadSettingsForAssistant(supabase: AnySupabase): Promise<PropertySettings> {
  const { data } = await supabase
    .from("property_settings")
    .select("*")
    .eq("scope", "global")
    .maybeSingle();
  return rowToSettings((data as Record<string, unknown> | null) ?? null);
}

export async function buildPropertiesSummary(
  supabase: AnySupabase,
  lang: AssistantLang,
): Promise<string> {
  const { data, error } = await supabase
    .from("properties")
    .select("name, category, property_type, is_active, image_urls, price_per_night, ical_import_url")
    .order("sort_order", { ascending: true })
    .limit(100);
  if (error || !data) return lang === "en" ? "(could not load)" : "(nepavyko įkelti)";
  const rows = data as Array<Record<string, unknown>>;
  if (rows.length === 0) return lang === "en" ? "No properties yet." : "Objektų dar nėra.";
  return rows
    .map((r) => {
      const photos = Array.isArray(r["image_urls"]) ? (r["image_urls"] as unknown[]).length : 0;
      const active = r["is_active"]
        ? lang === "en"
          ? "active"
          : "aktyvus"
        : lang === "en"
          ? "inactive"
          : "neaktyvus";
      const ical = r["ical_import_url"] ? (lang === "en" ? ", iCal on" : ", iCal įjungtas") : "";
      return `- ${String(r["name"])} (${String(r["category"] ?? r["property_type"] ?? "")}, ${active}, ${photos} ${lang === "en" ? "photos" : "nuotr."}, ${String(r["price_per_night"])} €/${lang === "en" ? "night" : "naktis"}${ical})`;
    })
    .join("\n");
}
