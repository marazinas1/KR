// Shared DB row -> PropertySettings mapping (used by server fns and invoicing).
import {
  DEFAULT_PROPERTY_SETTINGS,
  SETTINGS_COLUMN_MAP,
  type PropertySettings,
} from "./property-settings";

const NUMBER_KEYS: (keyof PropertySettings)[] = [
  "vatRate",
  "paymentDueDay",
  "defaultNoticeDays",
  "readingWindowFromDay",
  "readingWindowToDay",
  "invoiceNextNumber",
  "lat",
  "lng",
];

export function rowToSettings(row: Record<string, unknown> | null): PropertySettings {
  if (!row) return { ...DEFAULT_PROPERTY_SETTINGS };
  const out = { ...DEFAULT_PROPERTY_SETTINGS } as Record<string, unknown>;
  for (const [key, column] of Object.entries(SETTINGS_COLUMN_MAP)) {
    const raw = row[column];
    if (raw === undefined) continue;
    const k = key as keyof PropertySettings;
    if (NUMBER_KEYS.includes(k)) {
      out[key] = raw === null ? (k === "lat" || k === "lng" ? null : 0) : Number(raw);
    } else if (key === "paymentMethods") {
      out[key] = Array.isArray(raw) ? (raw as string[]) : [];
    } else if (raw === null) {
      out[key] = DEFAULT_PROPERTY_SETTINGS[k];
    } else {
      out[key] = raw;
    }
  }
  return out as PropertySettings;
}
