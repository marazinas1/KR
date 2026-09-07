import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Konstantos (jokių hardcoded reikšmių komponentuose)                  */
/* ------------------------------------------------------------------ */

export const CURRENCIES = [
  { value: "EUR", labelKey: "enums.currency.EUR" },
  { value: "USD", labelKey: "enums.currency.USD" },
  { value: "GBP", labelKey: "enums.currency.GBP" },
  { value: "ISK", labelKey: "enums.currency.ISK" },
  { value: "NOK", labelKey: "enums.currency.NOK" },
] as const;

export const LANGUAGES = [
  { value: "lt", label: "Lietuvių" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "is", label: "Íslenska" },
  { value: "no", label: "Norsk" },
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
  { value: "cash", labelKey: "enums.paymentMethod.cash" },
  { value: "bank_transfer", labelKey: "enums.paymentMethod.bank_transfer" },
  { value: "card", labelKey: "enums.paymentMethod.card" },
  { value: "stripe", label: "Stripe" },
  { value: "paysera", label: "Paysera" },
  { value: "paypal", label: "PayPal" },
] as const;

export const DEPOSIT_TYPES = [
  { value: "full", labelKey: "enums.depositType.full" },
  { value: "percent", labelKey: "enums.depositType.percent" },
  { value: "fixed", labelKey: "enums.depositType.fixed" },
] as const;

export const FEE_TYPES = [
  { value: "percent", labelKey: "enums.feeType.percent" },
  { value: "fixed", labelKey: "enums.feeType.fixed" },
  { value: "first_night", labelKey: "enums.feeType.first_night" },
] as const;

/* ------------------------------------------------------------------ */
/* Bendra nustatymų forma                                              */
/* ------------------------------------------------------------------ */

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "settings.validation.timeFormat");
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
  stay: z.object({
    checkinFrom: time,
    checkinUntil: time,
    checkoutUntil: time,
    minNights: z.number().int().min(1).max(365),
    maxNights: z.number().int().min(1).max(365),
    maxAdvanceDays: z.number().int().min(1).max(1095),
    autoConfirmBookings: z.boolean(),
    requirePhone: z.boolean(),
    requireEmail: z.boolean(),
    stayoverCleanEveryDays: z.number().int().min(0).max(30),
  }),
  guests: z.object({
    childrenFreeUntilAge: z.number().int().min(0).max(18),
    petsAllowed: z.boolean(),
    partiesAllowed: z.boolean(),
    quietHoursFrom: time,
    quietHoursTo: time,
    minGuestAge: z.number().int().min(0).max(99),
  }),
  taxes: z.object({
    vatRate: z.number().min(0).max(100),
    cityTax: z.number().min(0).max(1000),
    cityTaxMinAge: z.number().int().min(0).max(99),
    extraGuestFee: z.number().min(0).max(10000),
  }),
  payments: z.object({
    depositRequired: z.boolean(),
    depositType: z.enum(["full", "percent", "fixed"]),
    depositAmount: z.number().min(0).max(100000),
    paymentDueDays: z.number().int().min(0).max(365),
    paymentMethods: z.array(z.string()).default([]),
    autoRefundDeposit: z.boolean(),
  }),
  cancellation: z.object({
    freeCancellationDays: z.number().int().min(0).max(365),
    cancellationFeeType: z.enum(["percent", "fixed", "first_night"]),
    cancellationFee: z.number().min(0).max(100000),
    noShowFee: z.number().min(0).max(100000),
    cancellationPolicyText: z.string().max(5000).default(""),
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
    notifyBookingConfirmation: z.boolean(),
    notifyCheckinReminder: z.boolean(),
    notifyBookingChange: z.boolean(),
    notifyReviewRequest: z.boolean(),
    notifyCancellationConfirmation: z.boolean(),
    checkinReminderHoursBefore: z.number().int().min(1).max(336),
    reviewRequestHoursAfter: z.number().int().min(1).max(336),
    reviewLink: optionalText(500),
  }),
  branding: z.object({
    brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "settings.validation.hexColor"),
    brandSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "settings.validation.hexColor"),
    brandLogoUrl: optionalText(500),
    brandEmailLogoUrl: optionalText(500),
    brandPdfLogoUrl: optionalText(500),
  }),
} as const;

export type SettingsSectionId = keyof typeof settingsSchemas;

export const propertySettingsSchema = settingsSchemas.general
  .merge(settingsSchemas.stay)
  .merge(settingsSchemas.guests)
  .merge(settingsSchemas.taxes)
  .merge(settingsSchemas.payments)
  .merge(settingsSchemas.cancellation)
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

  checkinFrom: "15:00",
  checkinUntil: "22:00",
  checkoutUntil: "11:00",
  minNights: 1,
  maxNights: 30,
  maxAdvanceDays: 365,
  autoConfirmBookings: false,
  requirePhone: true,
  requireEmail: true,
  stayoverCleanEveryDays: 3,

  childrenFreeUntilAge: 3,
  petsAllowed: false,
  partiesAllowed: false,
  quietHoursFrom: "22:00",
  quietHoursTo: "07:00",
  minGuestAge: 18,

  vatRate: 21,
  cityTax: 0,
  cityTaxMinAge: 18,
  extraGuestFee: 0,

  depositRequired: false,
  depositType: "percent",
  depositAmount: 0,
  paymentDueDays: 3,
  paymentMethods: ["cash", "bank_transfer"],
  autoRefundDeposit: false,

  freeCancellationDays: 7,
  cancellationFeeType: "percent",
  cancellationFee: 0,
  noShowFee: 0,
  cancellationPolicyText: "",

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

  notifyBookingConfirmation: true,
  notifyCheckinReminder: true,
  notifyBookingChange: true,
  notifyReviewRequest: false,
  notifyCancellationConfirmation: true,
  checkinReminderHoursBefore: 24,
  reviewRequestHoursAfter: 24,
  reviewLink: "",

  brandPrimaryColor: "#0F172A",
  brandSecondaryColor: "#64748B",
  brandLogoUrl: "",
  brandEmailLogoUrl: "",
  brandPdfLogoUrl: "",
};

/** camelCase forma <-> snake_case DB stulpeliai */
export const SETTINGS_COLUMN_MAP: Record<keyof PropertySettings, string> = {
  displayName: "display_name",
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
  checkinFrom: "checkin_from",
  checkinUntil: "checkin_until",
  checkoutUntil: "checkout_until",
  minNights: "min_nights",
  maxNights: "max_nights",
  maxAdvanceDays: "max_advance_days",
  autoConfirmBookings: "auto_confirm_bookings",
  requirePhone: "require_phone",
  requireEmail: "require_email",
  stayoverCleanEveryDays: "stayover_clean_every_days",
  childrenFreeUntilAge: "children_free_until_age",
  petsAllowed: "pets_allowed",
  partiesAllowed: "parties_allowed",
  quietHoursFrom: "quiet_hours_from",
  quietHoursTo: "quiet_hours_to",
  minGuestAge: "min_guest_age",
  vatRate: "vat_rate",
  cityTax: "city_tax",
  cityTaxMinAge: "city_tax_min_age",
  extraGuestFee: "extra_guest_fee",
  depositRequired: "deposit_required",
  depositType: "deposit_type",
  depositAmount: "deposit_amount",
  paymentDueDays: "payment_due_days",
  paymentMethods: "payment_methods",
  autoRefundDeposit: "auto_refund_deposit",
  freeCancellationDays: "free_cancellation_days",
  cancellationFeeType: "cancellation_fee_type",
  cancellationFee: "cancellation_fee",
  noShowFee: "no_show_fee",
  cancellationPolicyText: "cancellation_policy_text",
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
  notifyBookingConfirmation: "notify_booking_confirmation",
  notifyCheckinReminder: "notify_checkin_reminder",
  notifyBookingChange: "notify_booking_change",
  notifyReviewRequest: "notify_review_request",
  notifyCancellationConfirmation: "notify_cancellation_confirmation",
  checkinReminderHoursBefore: "checkin_reminder_hours_before",
  reviewRequestHoursAfter: "review_request_hours_after",
  reviewLink: "review_link",
  brandPrimaryColor: "brand_primary_color",
  brandSecondaryColor: "brand_secondary_color",
  brandLogoUrl: "brand_logo_url",
  brandEmailLogoUrl: "brand_email_logo_url",
  brandPdfLogoUrl: "brand_pdf_logo_url",
};

export const hhmm = (v: unknown, fallback: string) =>
  typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : fallback;

/* ------------------------------------------------------------------ */
/* Sekcijų aprašai — naują sekciją pridedi vienu įrašu                  */
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
    icon: "🏨",
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
    id: "stay",
    icon: "🛏",
    titleKey: "settings.sections.stay.title",
    descriptionKey: "settings.sections.stay.description",
    fields: [
      { name: "checkinFrom", labelKey: "settings.sections.stay.fields.checkinFrom.label", type: "time", unitKey: "settings.units.hours" },
      { name: "checkinUntil", labelKey: "settings.sections.stay.fields.checkinUntil.label", type: "time", unitKey: "settings.units.hours" },
      { name: "checkoutUntil", labelKey: "settings.sections.stay.fields.checkoutUntil.label", type: "time", unitKey: "settings.units.hours" },
      { name: "minNights", labelKey: "settings.sections.stay.fields.minNights.label", type: "number", unitKey: "settings.units.nights", min: 1 },
      { name: "maxNights", labelKey: "settings.sections.stay.fields.maxNights.label", type: "number", unitKey: "settings.units.nights", min: 1 },
      { name: "maxAdvanceDays", labelKey: "settings.sections.stay.fields.maxAdvanceDays.label", type: "number", unitKey: "settings.units.days", min: 1, helpKey: "settings.sections.stay.fields.maxAdvanceDays.help" },
      { name: "autoConfirmBookings", labelKey: "settings.sections.stay.fields.autoConfirmBookings.label", type: "switch", colSpan: 2, helpKey: "settings.sections.stay.fields.autoConfirmBookings.help" },
      { name: "requirePhone", labelKey: "settings.sections.stay.fields.requirePhone.label", type: "switch", colSpan: 2 },
      { name: "requireEmail", labelKey: "settings.sections.stay.fields.requireEmail.label", type: "switch", colSpan: 2 },
      { name: "stayoverCleanEveryDays", labelKey: "settings.sections.stay.fields.stayoverCleanEveryDays.label", type: "number", unitKey: "settings.units.days", min: 0, helpKey: "settings.sections.stay.fields.stayoverCleanEveryDays.help" },
    ],
  },
  {
    id: "guests",
    icon: "👨‍👩‍👧",
    titleKey: "settings.sections.guests.title",
    descriptionKey: "settings.sections.guests.description",
    fields: [
      { name: "childrenFreeUntilAge", labelKey: "settings.sections.guests.fields.childrenFreeUntilAge.label", type: "number", unitKey: "settings.units.years", min: 0 },
      { name: "minGuestAge", labelKey: "settings.sections.guests.fields.minGuestAge.label", type: "number", unitKey: "settings.units.years", min: 0 },
      { name: "quietHoursFrom", labelKey: "settings.sections.guests.fields.quietHoursFrom.label", type: "time", unitKey: "settings.units.hours" },
      { name: "quietHoursTo", labelKey: "settings.sections.guests.fields.quietHoursTo.label", type: "time", unitKey: "settings.units.hours" },
      { name: "petsAllowed", labelKey: "settings.sections.guests.fields.petsAllowed.label", type: "switch", colSpan: 2 },
      { name: "partiesAllowed", labelKey: "settings.sections.guests.fields.partiesAllowed.label", type: "switch", colSpan: 2 },
    ],
  },
  {
    id: "taxes",
    icon: "💶",
    titleKey: "settings.sections.taxes.title",
    descriptionKey: "settings.sections.taxes.description",
    fields: [
      { name: "vatRate", labelKey: "settings.sections.taxes.fields.vatRate.label", type: "number", unitKey: "settings.units.percent", step: 0.01, min: 0 },
      { name: "cityTax", labelKey: "settings.sections.taxes.fields.cityTax.label", type: "number", unitKey: "settings.units.perGuestNight", step: 0.01, min: 0 },
      { name: "cityTaxMinAge", labelKey: "settings.sections.taxes.fields.cityTaxMinAge.label", type: "number", unitKey: "settings.units.years", min: 0, helpKey: "settings.sections.taxes.fields.cityTaxMinAge.help" },
      { name: "extraGuestFee", labelKey: "settings.sections.taxes.fields.extraGuestFee.label", type: "number", unitKey: "settings.units.perNight", step: 0.01, min: 0 },
    ],
  },
  {
    id: "payments",
    icon: "💳",
    titleKey: "settings.sections.payments.title",
    descriptionKey: "settings.sections.payments.description",
    fields: [
      { name: "depositRequired", labelKey: "settings.sections.payments.fields.depositRequired.label", type: "switch", colSpan: 2 },
      { name: "depositType", labelKey: "settings.sections.payments.fields.depositType.label", type: "select", options: DEPOSIT_TYPES },
      { name: "depositAmount", labelKey: "settings.sections.payments.fields.depositAmount.label", type: "number", unitKey: "settings.units.percentOrEur", step: 0.01, min: 0, helpKey: "settings.sections.payments.fields.depositAmount.help" },
      { name: "paymentDueDays", labelKey: "settings.sections.payments.fields.paymentDueDays.label", type: "number", unitKey: "settings.units.days", min: 0 },
      { name: "autoRefundDeposit", labelKey: "settings.sections.payments.fields.autoRefundDeposit.label", type: "switch", colSpan: 2 },
      { name: "paymentMethods", labelKey: "settings.sections.payments.fields.paymentMethods.label", type: "checkboxGroup", options: PAYMENT_METHODS, colSpan: 2 },
    ],
  },
  {
    id: "cancellation",
    icon: "🚫",
    titleKey: "settings.sections.cancellation.title",
    descriptionKey: "settings.sections.cancellation.description",
    fields: [
      { name: "freeCancellationDays", labelKey: "settings.sections.cancellation.fields.freeCancellationDays.label", type: "number", unitKey: "settings.units.daysBeforeArrival", min: 0 },
      { name: "cancellationFeeType", labelKey: "settings.sections.cancellation.fields.cancellationFeeType.label", type: "select", options: FEE_TYPES },
      { name: "cancellationFee", labelKey: "settings.sections.cancellation.fields.cancellationFee.label", type: "number", unitKey: "settings.units.percentOrEur", step: 0.01, min: 0 },
      { name: "noShowFee", labelKey: "settings.sections.cancellation.fields.noShowFee.label", type: "number", unitKey: "settings.units.percentOrEur", step: 0.01, min: 0 },
      { name: "cancellationPolicyText", labelKey: "settings.sections.cancellation.fields.cancellationPolicyText.label", type: "textarea", colSpan: 2, helpKey: "settings.sections.cancellation.fields.cancellationPolicyText.help" },
    ],
  },
  {
    id: "invoicing",
    icon: "📄",
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
      { name: "invoiceLogoUrl", labelKey: "settings.sections.invoicing.fields.invoiceLogoUrl.label", type: "url", colSpan: 2, helpKey: "settings.sections.invoicing.fields.invoiceLogoUrl.help" },
      { name: "invoiceNotes", labelKey: "settings.sections.invoicing.fields.invoiceNotes.label", type: "textarea", colSpan: 2 },
      { name: "invoiceIssuerName", labelKey: "settings.sections.invoicing.fields.invoiceIssuerName.label", type: "text", colSpan: 2, helpKey: "settings.sections.invoicing.fields.invoiceIssuerName.help" },
    ],
  },
  {
    id: "notifications",
    icon: "✉",
    titleKey: "settings.sections.notifications.title",
    descriptionKey: "settings.sections.notifications.description",
    fields: [
      { name: "notifyBookingConfirmation", labelKey: "settings.sections.notifications.fields.notifyBookingConfirmation.label", type: "switch", colSpan: 2 },
      { name: "notifyCheckinReminder", labelKey: "settings.sections.notifications.fields.notifyCheckinReminder.label", type: "switch", colSpan: 2 },
      { name: "notifyBookingChange", labelKey: "settings.sections.notifications.fields.notifyBookingChange.label", type: "switch", colSpan: 2 },
      { name: "notifyReviewRequest", labelKey: "settings.sections.notifications.fields.notifyReviewRequest.label", type: "switch", colSpan: 2 },
      { name: "notifyCancellationConfirmation", labelKey: "settings.sections.notifications.fields.notifyCancellationConfirmation.label", type: "switch", colSpan: 2 },
      { name: "checkinReminderHoursBefore", labelKey: "settings.sections.notifications.fields.checkinReminderHoursBefore.label", type: "number", unitKey: "settings.units.hours", min: 1 },
      { name: "reviewRequestHoursAfter", labelKey: "settings.sections.notifications.fields.reviewRequestHoursAfter.label", type: "number", unitKey: "settings.units.hours", min: 1 },
      { name: "reviewLink", labelKey: "settings.sections.notifications.fields.reviewLink.label", type: "text", colSpan: 2, helpKey: "settings.sections.notifications.fields.reviewLink.help" },
    ],
  },
  {
    id: "branding",
    icon: "🎨",
    titleKey: "settings.sections.branding.title",
    descriptionKey: "settings.sections.branding.description",
    fields: [
      { name: "brandPrimaryColor", labelKey: "settings.sections.branding.fields.brandPrimaryColor.label", type: "color" },
      { name: "brandSecondaryColor", labelKey: "settings.sections.branding.fields.brandSecondaryColor.label", type: "color" },
      { name: "brandLogoUrl", labelKey: "settings.sections.branding.fields.brandLogoUrl.label", type: "url", colSpan: 2 },
      { name: "brandEmailLogoUrl", labelKey: "settings.sections.branding.fields.brandEmailLogoUrl.label", type: "url", colSpan: 2 },
      { name: "brandPdfLogoUrl", labelKey: "settings.sections.branding.fields.brandPdfLogoUrl.label", type: "url", colSpan: 2 },
    ],
  },
];