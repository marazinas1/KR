import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Constants (no hardcoded values inside components)                    */
/* ------------------------------------------------------------------ */

export const CURRENCIES = [
  { value: "EUR", labelKey: "enums.currency.EUR" },
  { value: "USD", labelKey: "enums.currency.USD" },
  { value: "GBP", labelKey: "enums.currency.GBP" },
] as const;

export const LANGUAGES = [
  { value: "lt", label: "Lietuvių" },
  { value: "en", label: "English" },
] as const;

export const TIMEZONES = [
  { value: "Europe/Vilnius", label: "Europe/Vilnius (UTC+2/+3)" },
  { value: "Europe/Riga", label: "Europe/Riga" },
  { value: "Europe/Tallinn", label: "Europe/Tallinn" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "UTC", label: "UTC" },
] as const;

export const COUNTRIES = [
  { value: "LT", labelKey: "enums.country.LT" },
  { value: "LV", labelKey: "enums.country.LV" },
  { value: "EE", labelKey: "enums.country.EE" },
  { value: "PL", labelKey: "enums.country.PL" },
  { value: "DE", labelKey: "enums.country.DE" },
  { value: "GB", labelKey: "enums.country.GB" },
] as const;

export const PAYMENT_METHODS = [
  { value: "bank", labelKey: "enums.paymentMethod.bank_transfer" },
  { value: "cash", labelKey: "enums.paymentMethod.cash" },
  { value: "other", labelKey: "enums.paymentMethod.other" },
] as const;

/* ------------------------------------------------------------------ */
/* Settings form                                                        */
/* ------------------------------------------------------------------ */

const optionalText = (max = 300) => z.string().trim().max(max).default("");

export const settingsSchemas = {
  general: z.object({
    displayName: optionalText(200),
    address: optionalText(300),
    city: optionalText(120),
    postalCode: optionalText(20),
    country: z.string().min(2).max(3).default("LT"),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    timezone: z.string().min(1).default("Europe/Vilnius"),
    currency: z.string().min(3).max(3).default("EUR"),
    defaultLanguage: z.string().min(2).max(5).default("lt"),
    phone: optionalText(40),
    email: z.union([z.literal(""), z.string().email("settings.validation.email")]).default(""),
  }),
  rental: z.object({
    paymentDueDay: z.number().int().min(1).max(28),
    defaultNoticeDays: z.number().int().min(0).max(365),
    readingWindowFromDay: z.number().int().min(1).max(31),
    readingWindowToDay: z.number().int().min(1).max(28),
    requireMeterPhoto: z.boolean(),
    paymentMethods: z.array(z.string()).default([]),
    vatRate: z.number().min(0).max(100),
  }),
  invoicing: z.object({
    invoiceSeries: optionalText(20),
    invoiceNextNumber: z.number().int().min(1).max(1000000),
    companyName: optionalText(200),
    companyCode: optionalText(50),
    companyVatCode: optionalText(50),
    companyAddress: optionalText(300),
    iban: optionalText(50),
    bankName: optionalText(120),
    invoiceLogoUrl: optionalText(500),
    invoiceNotes: z.string().max(2000).default(""),
    invoiceIssuerName: optionalText(200),
  }),
  notifications: z.object({
    notifyReadingReminder: z.boolean(),
    notifyLeaseExpiring: z.boolean(),
    notifyPaymentOverdue: z.boolean(),
    notifyIssueUpdate: z.boolean(),
    notifyNewInquiry: z.boolean(),
  }),
  branding: z.object({
    tagline: optionalText(120),
    brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "settings.validation.hexColor"),
    brandSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "settings.validation.hexColor"),
    brandLogoUrl: optionalText(500),
    brandEmailLogoUrl: optionalText(500),
    brandPdfLogoUrl: optionalText(500),
  }),
} as const;

export type SettingsSectionId = keyof typeof settingsSchemas;

export const propertySettingsSchema = settingsSchemas.general
  .merge(settingsSchemas.rental)
  .merge(settingsSchemas.invoicing)
  .merge(settingsSchemas.notifications)
  .merge(settingsSchemas.branding);

export type PropertySettings = z.infer<typeof propertySettingsSchema>;

export const DEFAULT_PROPERTY_SETTINGS: PropertySettings = {
  displayName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "LT",
  lat: null,
  lng: null,
  timezone: "Europe/Vilnius",
  currency: "EUR",
  defaultLanguage: "lt",
  phone: "",
  email: "",

  paymentDueDay: 10,
  defaultNoticeDays: 30,
  readingWindowFromDay: 25,
  readingWindowToDay: 5,
  requireMeterPhoto: true,
  paymentMethods: ["bank"],
  vatRate: 21,

  invoiceSeries: "",
  invoiceNextNumber: 1,
  companyName: "",
  companyCode: "",
  companyVatCode: "",
  companyAddress: "",
  iban: "",
  bankName: "",
  invoiceLogoUrl: "",
  invoiceNotes: "",
  invoiceIssuerName: "",

  notifyReadingReminder: true,
  notifyLeaseExpiring: true,
  notifyPaymentOverdue: true,
  notifyIssueUpdate: true,
  notifyNewInquiry: true,

  tagline: "Ilgalaikė nuoma",
  brandPrimaryColor: "#0F172A",
  brandSecondaryColor: "#64748B",
  brandLogoUrl: "",
  brandEmailLogoUrl: "",
  brandPdfLogoUrl: "",
};

/** camelCase form <-> snake_case DB columns (public.org_settings) */
export const SETTINGS_COLUMN_MAP: Record<keyof PropertySettings, string> = {
  displayName: "display_name",
  tagline: "tagline",
  address: "address",
  city: "city",
  postalCode: "postal_code",
  country: "country",
  lat: "lat",
  lng: "lng",
  timezone: "timezone",
  currency: "currency",
  defaultLanguage: "default_language",
  phone: "phone",
  email: "email",
  paymentDueDay: "payment_due_day",
  defaultNoticeDays: "default_notice_days",
  readingWindowFromDay: "reading_window_from_day",
  readingWindowToDay: "reading_window_to_day",
  requireMeterPhoto: "require_meter_photo",
  paymentMethods: "payment_methods",
  vatRate: "vat_rate",
  invoiceSeries: "invoice_series",
  invoiceNextNumber: "invoice_next_number",
  companyName: "company_name",
  companyCode: "company_code",
  companyVatCode: "company_vat_code",
  companyAddress: "company_address",
  iban: "iban",
  bankName: "bank_name",
  invoiceLogoUrl: "invoice_logo_url",
  invoiceNotes: "invoice_notes",
  invoiceIssuerName: "invoice_issuer_name",
  notifyReadingReminder: "notify_reading_reminder",
  notifyLeaseExpiring: "notify_lease_expiring",
  notifyPaymentOverdue: "notify_payment_overdue",
  notifyIssueUpdate: "notify_issue_update",
  notifyNewInquiry: "notify_new_inquiry",
  brandPrimaryColor: "brand_primary_color",
  brandSecondaryColor: "brand_secondary_color",
  brandLogoUrl: "brand_logo_url",
  brandEmailLogoUrl: "brand_email_logo_url",
  brandPdfLogoUrl: "brand_pdf_logo_url",
};

export const hhmm = (v: unknown, fallback: string) =>
  typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : fallback;

/* ------------------------------------------------------------------ */
/* Section definitions                                                  */
/* ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "time"
  | "switch"
  | "select"
  | "textarea"
  | "color"
  | "checkboxGroup";

export type SelectOption = { value: string; label?: string; labelKey?: string };

export type FieldDef = {
  name: keyof PropertySettings;
  labelKey: string;
  type: FieldType;
  helpKey?: string;
  unitKey?: string;
  options?: readonly SelectOption[];
  step?: number;
  min?: number;
  max?: number;
  nullable?: boolean;
  colSpan?: 1 | 2;
};

export type SectionDef = {
  id: SettingsSectionId;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  fields: FieldDef[];
};

export const SETTINGS_SECTIONS: SectionDef[] = [
  {
    id: "general",
    icon: "🏢",
    titleKey: "settings.sections.general.title",
    descriptionKey: "settings.sections.general.description",
    fields: [
      { name: "displayName", labelKey: "settings.sections.general.fields.displayName.label", type: "text", helpKey: "settings.sections.general.fields.displayName.help" },
      { name: "address", labelKey: "settings.sections.general.fields.address.label", type: "text", helpKey: "settings.sections.general.fields.address.help" },
      { name: "city", labelKey: "settings.sections.general.fields.city.label", type: "text" },
      { name: "postalCode", labelKey: "settings.sections.general.fields.postalCode.label", type: "text" },
      { name: "country", labelKey: "settings.sections.general.fields.country.label", type: "select", options: COUNTRIES },
      { name: "timezone", labelKey: "settings.sections.general.fields.timezone.label", type: "select", options: TIMEZONES, helpKey: "settings.sections.general.fields.timezone.help" },
      { name: "lat", labelKey: "settings.sections.general.fields.lat.label", type: "number", step: 0.000001, nullable: true, helpKey: "settings.sections.general.fields.lat.help" },
      { name: "lng", labelKey: "settings.sections.general.fields.lng.label", type: "number", step: 0.000001, nullable: true, helpKey: "settings.sections.general.fields.lng.help" },
      { name: "currency", labelKey: "settings.sections.general.fields.currency.label", type: "select", options: CURRENCIES },
      { name: "defaultLanguage", labelKey: "settings.sections.general.fields.defaultLanguage.label", type: "select", options: LANGUAGES },
      { name: "phone", labelKey: "settings.sections.general.fields.phone.label", type: "tel", helpKey: "settings.sections.general.fields.phone.help" },
      { name: "email", labelKey: "settings.sections.general.fields.email.label", type: "email", helpKey: "settings.sections.general.fields.email.help" },
    ],
  },
  {
    id: "rental",
    icon: "🔑",
    titleKey: "settings.sections.rental.title",
    descriptionKey: "settings.sections.rental.description",
    fields: [
      { name: "paymentDueDay", labelKey: "settings.sections.rental.fields.paymentDueDay.label", type: "number", min: 1, max: 28, helpKey: "settings.sections.rental.fields.paymentDueDay.help" },
      { name: "defaultNoticeDays", labelKey: "settings.sections.rental.fields.defaultNoticeDays.label", type: "number", unitKey: "settings.units.days", min: 0 },
      { name: "readingWindowFromDay", labelKey: "settings.sections.rental.fields.readingWindowFromDay.label", type: "number", min: 1, max: 31, helpKey: "settings.sections.rental.fields.readingWindowFromDay.help" },
      { name: "readingWindowToDay", labelKey: "settings.sections.rental.fields.readingWindowToDay.label", type: "number", min: 1, max: 28 },
      { name: "requireMeterPhoto", labelKey: "settings.sections.rental.fields.requireMeterPhoto.label", type: "switch", colSpan: 2, helpKey: "settings.sections.rental.fields.requireMeterPhoto.help" },
      { name: "paymentMethods", labelKey: "settings.sections.rental.fields.paymentMethods.label", type: "checkboxGroup", options: PAYMENT_METHODS, colSpan: 2 },
      { name: "vatRate", labelKey: "settings.sections.rental.fields.vatRate.label", type: "number", unitKey: "settings.units.percent", step: 0.01, min: 0 },
    ],
  },
  {
    id: "invoicing",
    icon: "🧾",
    titleKey: "settings.sections.invoicing.title",
    descriptionKey: "settings.sections.invoicing.description",
    fields: [
      { name: "invoiceSeries", labelKey: "settings.sections.invoicing.fields.invoiceSeries.label", type: "text", helpKey: "settings.sections.invoicing.fields.invoiceSeries.help" },
      { name: "invoiceNextNumber", labelKey: "settings.sections.invoicing.fields.invoiceNextNumber.label", type: "number", min: 1 },
      { name: "companyName", labelKey: "settings.sections.invoicing.fields.companyName.label", type: "text" },
      { name: "companyCode", labelKey: "settings.sections.invoicing.fields.companyCode.label", type: "text" },
      { name: "companyVatCode", labelKey: "settings.sections.invoicing.fields.companyVatCode.label", type: "text" },
      { name: "companyAddress", labelKey: "settings.sections.invoicing.fields.companyAddress.label", type: "text" },
      { name: "iban", labelKey: "settings.sections.invoicing.fields.iban.label", type: "text" },
      { name: "bankName", labelKey: "settings.sections.invoicing.fields.bankName.label", type: "text" },
      { name: "invoiceIssuerName", labelKey: "settings.sections.invoicing.fields.invoiceIssuerName.label", type: "text" },
      { name: "invoiceLogoUrl", labelKey: "settings.sections.invoicing.fields.invoiceLogoUrl.label", type: "url" },
      { name: "invoiceNotes", labelKey: "settings.sections.invoicing.fields.invoiceNotes.label", type: "textarea", colSpan: 2 },
    ],
  },
  {
    id: "notifications",
    icon: "🔔",
    titleKey: "settings.sections.notifications.title",
    descriptionKey: "settings.sections.notifications.description",
    fields: [
      { name: "notifyReadingReminder", labelKey: "settings.sections.notifications.fields.notifyReadingReminder.label", type: "switch", colSpan: 2 },
      { name: "notifyLeaseExpiring", labelKey: "settings.sections.notifications.fields.notifyLeaseExpiring.label", type: "switch", colSpan: 2 },
      { name: "notifyPaymentOverdue", labelKey: "settings.sections.notifications.fields.notifyPaymentOverdue.label", type: "switch", colSpan: 2 },
      { name: "notifyIssueUpdate", labelKey: "settings.sections.notifications.fields.notifyIssueUpdate.label", type: "switch", colSpan: 2 },
      { name: "notifyNewInquiry", labelKey: "settings.sections.notifications.fields.notifyNewInquiry.label", type: "switch", colSpan: 2 },
    ],
  },
  {
    id: "branding",
    icon: "🎨",
    titleKey: "settings.sections.branding.title",
    descriptionKey: "settings.sections.branding.description",
    fields: [
      { name: "tagline", labelKey: "settings.sections.branding.fields.tagline.label", type: "text", helpKey: "settings.sections.branding.fields.tagline.help" },
      { name: "brandPrimaryColor", labelKey: "settings.sections.branding.fields.brandPrimaryColor.label", type: "color" },
      { name: "brandSecondaryColor", labelKey: "settings.sections.branding.fields.brandSecondaryColor.label", type: "color" },
      { name: "brandLogoUrl", labelKey: "settings.sections.branding.fields.brandLogoUrl.label", type: "url" },
      { name: "brandEmailLogoUrl", labelKey: "settings.sections.branding.fields.brandEmailLogoUrl.label", type: "url" },
      { name: "brandPdfLogoUrl", labelKey: "settings.sections.branding.fields.brandPdfLogoUrl.label", type: "url" },
    ],
  },
];
