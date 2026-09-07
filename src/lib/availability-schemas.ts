import { z } from "zod";

/** Client-safe schemas for the aggregated availability summary. */
export const availabilityInputSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(50).default(2),
});

export const availabilityGroupSchema = z.object({
  code: z.string(),
  free_count: z.number(),
  total_count: z.number(),
  price_from: z.number().nullable(),
  currency: z.string().nullable(),
});

export const availabilityUnitSchema = z.object({
  id: z.string(),
  total: z.number().nullable(),
  currency: z.string().nullable(),
});

export const availabilitySummarySchema = z.object({
  date_from: z.string(),
  date_to: z.string(),
  nights: z.number(),
  groups: z.array(availabilityGroupSchema),
  free_ids: z.array(z.string()),
  /** Per-property totals for the requested range (same order as free_ids). */
  free_units: z.array(availabilityUnitSchema).default([]),
});

export type AvailabilityInput = z.input<typeof availabilityInputSchema>;
export type AvailabilityUnit = z.infer<typeof availabilityUnitSchema>;
export type AvailabilityGroup = z.infer<typeof availabilityGroupSchema>;
export type AvailabilitySummary = z.infer<typeof availabilitySummarySchema>;