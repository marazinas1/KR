/**
 * Shared long-term rental enums.
 *
 * Every list here mirrors a database CHECK constraint one-to-one. The admin UI
 * renders these as selects — never free text — so the UI cannot drift from the
 * constraint. If a value changes in the database, change it here too.
 */

export const UNIT_STATUSES = [
  "vacant",
  "occupied",
  "reserved",
  "renovation",
  "inactive",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const LEASE_STATUSES = ["draft", "active", "ending", "expired", "terminated"] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const BUILDING_KINDS = ["apartment_building", "dormitory", "house", "other"] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export const METER_TYPES = [
  "electricity_day",
  "electricity_night",
  "cold_water",
  "hot_water",
  "gas",
  "heating",
] as const;
export type MeterType = (typeof METER_TYPES)[number];

export const READING_STATUSES = ["submitted", "approved", "rejected"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const ISSUE_STATUSES = [
  "new",
  "acknowledged",
  "in_progress",
  "waiting",
  "resolved",
  "rejected",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_CATEGORIES = [
  "plumbing",
  "electrical",
  "heating",
  "appliance",
  "door_lock",
  "damage",
  "other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];


export const DOCUMENT_KINDS = [
  "lease_contract",
  "act",
  "id_document",
  "invoice",
  "insurance",
  "inspection",
  "house_rules",
  "other",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const UNIT_EVENT_KINDS = [
  "occupied",
  "vacated",
  "renovation",
  "inspection",
  "other",
] as const;

/** Leases that currently hold the unit. */
export const HOLDING_LEASE_STATUSES: LeaseStatus[] = ["active", "ending"];

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** First day of the current month — the reading period the tenant portal submits against and the dashboard checks. */
export const currentPeriod = () => `${new Date().toISOString().slice(0, 7)}-01`;

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "viewing_scheduled",
  "converted",
  "dismissed",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Money display; currency comes from org settings later (step 8) — EUR default. */
export function formatMoney(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("lt-LT", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
