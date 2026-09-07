import { z } from "zod";

/**
 * Zod schemas for the Core (Rentivo) booking API. Client-safe: types only, no
 * secrets. Lenient on optional fields so additive API changes never take a page
 * down, strict on ids and on the response envelope.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(jsonSchema),
  ]),
);

export const extraServiceSchema = z
  .object({
    name: z.string(),
    calc: z.string().nullish(),
    pricePerDay: z.number().nullish(),
  })
  .catchall(jsonSchema);

export const propertySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    property_type: z.string().nullish(),
    description: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    address: z.string().nullish(),
    area_m2: z.number().nullish(),
    max_guests: z.number().nullish(),
    beds: z.number().nullish(),
    rooms: jsonSchema.nullish(),
    amenities: z.array(z.string()).nullish().transform((value) => value ?? []),
    price_per_night: z.number().nullish(),
    price_tiers: z
      .array(jsonSchema)
      .nullish()
      .transform((value) => value ?? []),
    extra_services: z
      .array(extraServiceSchema)
      .nullish()
      .transform((value) => value ?? []),
    cover_image_url: z.string().nullish(),
    image_urls: z.array(z.string()).nullish().transform((value) => value ?? []),
    category: z.string().nullish(),
  })
  .catchall(jsonSchema);

export const occupiedRangeSchema = z.object({
  date_from: z.string(),
  date_to: z.string(),
});

export const propertyDetailSchema = propertySchema.and(
  z.object({
    occupied: z
      .array(occupiedRangeSchema)
      .nullish()
      .transform((value) => value ?? []),
  }),
);

export const propertiesResponseSchema = z.object({ data: z.array(propertySchema) });
export const propertyDetailResponseSchema = z.object({ data: propertyDetailSchema });

export type Property = z.infer<typeof propertySchema>;
export type PropertyDetail = z.infer<typeof propertyDetailSchema>;
export type ExtraService = z.infer<typeof extraServiceSchema>;

/* ---- Phase 2 payloads (schemas ready, not wired to UI yet) ---- */

export const quoteInputSchema = z.object({
  property_id: z.string().uuid(),
  date_from: z.string(),
  date_to: z.string(),
  adults: z.number().int().min(1).max(50).default(1),
  children: z.number().int().min(0).max(50).default(0),
  infants: z.number().int().min(0).max(50).default(0),
  extras: z.array(z.object({ name: z.string() })).max(20).default([]),
  // The engine stores this on the booking and uses it for guest emails and for
  // matching extra-service names, so it must travel with both requests.
  language: z.enum(["lt", "en"]).default("lt"),
});

export const quoteResponseSchema = z.object({
  data: z.object({
    nights: z.number(),
    nightly_rate: z.number(),
    stay_total: z.number(),
    extras: z.array(extraServiceSchema.and(z.object({ amount: z.number() }))).default([]),
    extras_total: z.number(),
    total: z.number(),
    currency: z.string(),
    available: z.boolean().nullish(),
  }),
});

export const bookingInputSchema = quoteInputSchema.extend({
  customer_name: z.string().min(2).max(200),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().min(5).max(50),
  bic: z.string().max(20).optional(),
  accepted_terms: z.literal(true),
  is_company: z.boolean().default(false),
  company_name: z.string().max(200).optional(),
  company_code: z.string().max(50).optional(),
  company_vat_code: z.string().max(50).optional(),
  company_address: z.string().max(300).optional(),
});

export const legalKindSchema = z.enum(["rental", "privacy"]);

export const legalInputSchema = z.object({
  kind: legalKindSchema,
  language: z.string().min(2).max(5).default("lt"),
});

export const legalResponseSchema = z.object({
  data: z.object({
    kind: z.string(),
    language: z.string().nullish(),
    name: z.string().nullish(),
    content: z.string().nullish(),
    updated_at: z.string().nullish(),
  }),
});

export type LegalKind = z.infer<typeof legalKindSchema>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(10).max(2000),
});

export type LegalDocument = {
  kind: string;
  name: string;
  html: string;
  updated_at: string | null;
};

export const bookingResponseSchema = z.object({
  data: z.object({
    booking_number: z.string(),
    status: z.string(),
    date_from: z.string(),
    date_to: z.string(),
    total_amount: z.number(),
    currency: z.string(),
    expires_at: z.string().nullish(),
    nights: z.number(),
    extras: z.array(jsonSchema).default([]),
  }),
});

export const paymentDetailsResponseSchema = z.object({
  data: z.object({
    iban: z.string().nullish(),
    bank_name: z.string().nullish(),
    beneficiary_name: z.string().nullish(),
    currency: z.string().nullish(),
  }),
});

export const bookingStatusResponseSchema = z.object({
  data: z
    .object({
      booking_number: z.string(),
      property_id: z.string(),
      date_from: z.string(),
      date_to: z.string(),
      status: z.string(),
      payment_status: z.string(),
      total_amount: z.number(),
      currency: z.string(),
      extras_total: z.number().nullish(),
    })
    .catchall(jsonSchema),
});

export type QuoteInput = z.input<typeof quoteInputSchema>;
export type BookingInput = z.input<typeof bookingInputSchema>;