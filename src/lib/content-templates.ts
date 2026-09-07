import { z } from "zod";

export const CONTENT_VARIABLES = [
  { token: "{{guest_name}}", labelKey: "content.variables.guest_name" },
  { token: "{{guest_name_vocative}}", labelKey: "content.variables.guest_name_vocative" },
  { token: "{{property_name}}", labelKey: "content.variables.property_name" },
  { token: "{{location}}", labelKey: "content.variables.location" },
  { token: "{{room_name}}", labelKey: "content.variables.room_name" },
  { token: "{{booking_number}}", labelKey: "content.variables.booking_number" },
  { token: "{{date_from}}", labelKey: "content.variables.date_from" },
  { token: "{{date_to}}", labelKey: "content.variables.date_to" },
  { token: "{{check_in}}", labelKey: "content.variables.check_in" },
  { token: "{{check_out}}", labelKey: "content.variables.check_out" },
  { token: "{{check_in_until}}", labelKey: "content.variables.check_in_until" },
  { token: "{{quiet_hours_from}}", labelKey: "content.variables.quiet_hours_from" },
  { token: "{{quiet_hours_to}}", labelKey: "content.variables.quiet_hours_to" },
  { token: "{{door_code}}", labelKey: "content.variables.door_code" },
  { token: "{{wifi_name}}", labelKey: "content.variables.wifi_name" },
  { token: "{{wifi_password}}", labelKey: "content.variables.wifi_password" },
  { token: "{{total_amount}}", labelKey: "content.variables.total_amount" },
  { token: "{{currency}}", labelKey: "content.variables.currency" },
  { token: "{{phone}}", labelKey: "content.variables.phone" },
  { token: "{{email}}", labelKey: "content.variables.email" },
  { token: "{{review_link}}", labelKey: "content.variables.review_link" },
] as const;

export const PREVIEW_SAMPLE: Record<string, string> = {
  "{{guest_name}}": "Jonas Jonaitis",
  "{{guest_name_vocative}}": "Jonai Jonaiti",
  "{{property_name}}": "Dharma Stay",
  "{{location}}": "Vilniaus g. 10, Druskininkai — 2 aukštas, durys Nr. 3",
  "{{room_name}}": "Miegamasis 1",
  "{{booking_number}}": "R-26001",
  "{{date_from}}": "2026-08-10",
  "{{date_to}}": "2026-08-14",
  "{{check_in}}": "15:00",
  "{{check_out}}": "11:00",
  "{{check_in_until}}": "22:00",
  "{{quiet_hours_from}}": "22:00",
  "{{quiet_hours_to}}": "07:00",
  "{{door_code}}": "1234#",
  "{{wifi_name}}": "DharmaStay_WiFi",
  "{{wifi_password}}": "svecias2026",
  "{{total_amount}}": "480,00",
  "{{currency}}": "EUR",
  "{{phone}}": "+370 600 00000",
  "{{email}}": "info@revoo.lt",
  "{{review_link}}": "https://g.page/r/atsiliepimas",
};

export function renderPreview(text: string) {
  return Object.entries(PREVIEW_SAMPLE).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text ?? "",
  );
}

export type ContentCategory = "email" | "whatsapp" | "guest_info";

export type ContentFieldDef = {
  name: string;
  labelKey: string;
  /** Etiketė serverio/atsarginiam naudojimui (be i18n konteksto). */
  label: string;
  type: "text" | "textarea" | "url";
  defaultValue?: string;
  required?: boolean;
};

export type ContentTemplateDef = {
  category: ContentCategory;
  name: string;
  titleKey: string;
  descriptionKey: string;
  /** Originali lietuviška antraštė — naudojama serveryje (laiškų žurnale). */
  title: string;
  hasSubject: boolean;
  hasRichText: boolean;
  canTestSend?: boolean;
  canTestWhatsapp?: boolean;
  fields?: ContentFieldDef[];
  defaultSubject?: string;
  defaultContent?: string;
  openLinkField?: string;
};

export const ETURISTAS_DEFAULT_URL =
  "https://eturistas.ntis.lt/srv-edit/yGcAqPoxUjtPUWOfNdvFwKYYcQrnDfRBnjZlcFokltyAnhvhJe";

export const CONTENT_TEMPLATES: ContentTemplateDef[] = [
  {
    category: "email",
    name: "booking_confirmation",
    title: "Rezervacijos patvirtinimas",
    titleKey: "content.templates.booking_confirmation.title",
    descriptionKey: "content.templates.booking_confirmation.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Jūsų rezervacija {{booking_number}} patvirtinta",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Jūsų rezervacija <strong>{{booking_number}}</strong> objekte {{property_name}} patvirtinta.</p><p>Atvykimas: {{date_from}} nuo {{check_in}}<br>Išvykimas: {{date_to}} iki {{check_out}}<br>Suma: {{total_amount}} {{currency}}</p><p>Iki susitikimo!</p>",
  },
  {
    category: "email",
    name: "booking_cancellation",
    title: "Rezervacijos atšaukimas",
    titleKey: "content.templates.booking_cancellation.title",
    descriptionKey: "content.templates.booking_cancellation.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Rezervacija {{booking_number}} atšaukta",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Informuojame, kad Jūsų rezervacija {{booking_number}} objekte {{property_name}} ({{date_from}}–{{date_to}}) buvo atšaukta.</p><p>Kilus klausimams, rašykite {{email}} arba skambinkite {{phone}}.</p>",
  },
  {
    category: "email",
    name: "booking_change",
    title: "Rezervacijos pakeitimas",
    titleKey: "content.templates.booking_change.title",
    descriptionKey: "content.templates.booking_change.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Rezervacijos {{booking_number}} pakeitimai",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Jūsų rezervacija {{booking_number}} buvo atnaujinta.</p><p>Naujos datos: {{date_from}} – {{date_to}}<br>Suma: {{total_amount}} {{currency}}</p>",
  },
  {
    category: "email",
    name: "checkin_reminder",
    title: "Priminimas prieš atvykimą",
    titleKey: "content.templates.checkin_reminder.title",
    descriptionKey: "content.templates.checkin_reminder.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Laukiame Jūsų {{date_from}} — {{property_name}}",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Primename apie artėjantį apsilankymą objekte {{property_name}}.</p><p>Atvykimas: {{date_from}} nuo {{check_in}}<br>Durų kodas: {{door_code}}<br>WiFi: {{wifi_name}} / {{wifi_password}}</p>",
  },
  {
    category: "email",
    name: "review_request",
    title: "Prašymas palikti atsiliepimą",
    titleKey: "content.templates.review_request.title",
    descriptionKey: "content.templates.review_request.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Ačiū, kad viešėjote {{property_name}}",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Ačiū, kad rinkotės {{property_name}}. Būsime dėkingi už Jūsų atsiliepimą.</p>",
  },
  {
    category: "whatsapp",
    name: "door_code",
    title: "Durų kodas",
    titleKey: "content.templates.door_code.title",
    descriptionKey: "content.templates.door_code.description",
    hasSubject: false,
    hasRichText: false,
    canTestWhatsapp: true,
    defaultContent:
      "Sveiki, {{guest_name}}! Jūsų durų kodas objekte {{property_name}}: {{door_code}}. Atvykimas {{date_from}} nuo {{check_in}}. WiFi: {{wifi_name}} / {{wifi_password}}",
  },
  {
    category: "guest_info",
    name: "wifi",
    title: "WiFi",
    titleKey: "content.templates.wifi.title",
    descriptionKey: "content.templates.wifi.description",
    hasSubject: false,
    hasRichText: false,
    fields: [
      { name: "wifiName", label: "WiFi pavadinimas", labelKey: "content.fields.wifiName", type: "text", required: true },
      { name: "wifiPassword", label: "WiFi slaptažodis", labelKey: "content.fields.wifiPassword", type: "text", required: true },
    ],
  },
  {
    category: "guest_info",
    name: "restaurant",
    title: "Restorano informacija",
    titleKey: "content.templates.restaurant.title",
    descriptionKey: "content.templates.restaurant.description",
    hasSubject: false,
    hasRichText: true,
  },
  {
    category: "guest_info",
    name: "eturistas",
    title: "E. turistas",
    titleKey: "content.templates.eturistas.title",
    descriptionKey: "content.templates.eturistas.description",
    hasSubject: false,
    hasRichText: false,
    openLinkField: "url",
    fields: [
      { name: "title", label: "Pavadinimas", labelKey: "content.fields.title", type: "text", defaultValue: "E. turistas", required: true },
      {
        name: "description",
        label: "Aprašymas",
        labelKey: "content.fields.description",
        type: "textarea",
        defaultValue:
          "Prieš atvykstant prašome užpildyti svečio registracijos formą E. turisto sistemoje.",
      },
      { name: "url", label: "Nuoroda", labelKey: "content.fields.url", type: "url", defaultValue: ETURISTAS_DEFAULT_URL, required: true },
    ],
  },
];

export const CONTENT_SECTIONS: {
  id: ContentCategory;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}[] = [
  {
    id: "email",
    icon: "✉️",
    titleKey: "content.sections.email.title",
    descriptionKey: "content.sections.email.description",
  },
  {
    id: "whatsapp",
    icon: "💬",
    titleKey: "content.sections.whatsapp.title",
    descriptionKey: "content.sections.whatsapp.description",
  },
  {
    id: "guest_info",
    icon: "🛎️",
    titleKey: "content.sections.guest_info.title",
    descriptionKey: "content.sections.guest_info.description",
  },
];

export function templateKey(category: string, name: string) {
  return `${category}:${name}`;
}

/** Normalizuoja LT/tarptautinį telefono numerį į E.164 be „+“ (wa.me formatas). */
export function normalizeWhatsappPhone(raw: string): string {
  const digits = (raw ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("8") && n.length === 9) n = `370${n.slice(1)}`;
  return n;
}

export function buildWhatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export const contentTemplateSchema = z.object({
  category: z.enum(["email", "whatsapp", "guest_info"]),
  templateName: z.string().min(1).max(80),
  subject: z.string().max(300).default(""),
  content: z.string().max(20000).default(""),
  fields: z.record(z.string().max(2000)).default({}),
  isEnabled: z.boolean().default(true),
});

export type ContentTemplateRecord = {
  /** DB eilutės ID; null, kai šablonas dar neišsaugotas. */
  id: string | null;
  category: ContentCategory;
  templateName: string;
  subject: string;
  content: string;
  fields: Record<string, string>;
  isEnabled: boolean;
  updatedAt: string | null;
};

export function defaultsFor(def: ContentTemplateDef): ContentTemplateRecord {
  const fields: Record<string, string> = {};
  for (const f of def.fields ?? []) fields[f.name] = f.defaultValue ?? "";
  return {
    id: null,
    category: def.category,
    templateName: def.name,
    subject: def.defaultSubject ?? "",
    content: def.defaultContent ?? "",
    fields,
    isEnabled: true,
    updatedAt: null,
  };
}

export function buildFormSchema(
  def: ContentTemplateDef,
  t: (key: string, opts?: Record<string, unknown>) => string = (k) => k,
) {
  const shape: Record<string, z.ZodTypeAny> = { isEnabled: z.boolean() };

  shape["subject"] = def.hasSubject
    ? z
        .string()
        .trim()
        .min(1, t("content.validation.subjectRequired"))
        .max(300, t("content.validation.subjectTooLong"))
    : z.string().max(300);

  const needsContent = def.hasRichText || def.category === "whatsapp";
  shape["content"] = needsContent
    ? z
        .string()
        .trim()
        .min(1, t("content.validation.contentRequired"))
        .max(20000, t("content.validation.contentTooLong"))
    : z.string().max(20000);

  const fieldShape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields ?? []) {
    if (f.type === "url") {
      const url = z.string().trim().url(t("content.validation.invalidUrl"));
      fieldShape[f.name] = f.required ? url : z.union([z.literal(""), url]);
    } else {
      let s = z.string().trim().max(2000);
      if (f.required)
        s = s.min(1, t("content.validation.fieldRequired", { field: t(f.labelKey) }));
      fieldShape[f.name] = s;
    }
  }
  shape["fields"] = z.object(fieldShape);

  return z.object(shape);
}