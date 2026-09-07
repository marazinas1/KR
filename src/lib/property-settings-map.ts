// Bendras DB eilutės -> PropertySettings mapinimas (naudoja ir serverFn, ir sąskaitų logika).
import {
  DEFAULT_PROPERTY_SETTINGS,
  SETTINGS_COLUMN_MAP,
  hhmm,
  type PropertySettings,
} from "./property-settings";

const TIME_KEYS: (keyof PropertySettings)[] = [
  "checkinFrom",
  "checkinUntil",
  "checkoutUntil",
  "quietHoursFrom",
  "quietHoursTo",
];
const NUMBER_KEYS: (keyof PropertySettings)[] = [
  "vatRate",
  "cityTax",
  "extraGuestFee",
  "depositAmount",
  "cancellationFee",
  "noShowFee",
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
    if (TIME_KEYS.includes(k)) {
      out[key] = hhmm(raw, String(DEFAULT_PROPERTY_SETTINGS[k]));
    } else if (NUMBER_KEYS.includes(k)) {
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