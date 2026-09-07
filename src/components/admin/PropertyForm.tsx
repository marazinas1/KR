import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AMENITIES,
  AMENITY_LABEL_KEYS,
  BED_TYPES,
  PROPERTY_TYPES,
  ROOM_KINDS,
  EXTRA_SERVICE_PRESETS,
  EXTRA_CALCS,
  EXTRA_CALC_LABEL_KEYS,
  type ExtraService,
  type ExtraCalc,
  type Property,
  type RoomConfig,
} from "@/lib/properties";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { NumberInput } from "@/components/NumberInput";

export type PropertyFormValues = {
  name: string;
  propertyType: string;
  description: string;
  address: string;
  city: string;
  country: string;
  locationNote: string;
  doorCode: string;
  lat: number | null;
  lng: number | null;
  areaM2: number | null;
  maxGuests: number;
  beds: number;
  rooms: {
    bedrooms?: number;
    living_rooms?: number;
    bathrooms?: number;
    kitchenette?: boolean;
    parking_spot?: boolean;
    notes?: string;
    configs?: RoomConfig[];
  };
  amenities: string[];
  pricePerNight: number;
  priceTiers: Array<{
    label: string;
    minNights: number;
    maxNights: number;
    pricePerNight: number;
  }>;
  extraServices: ExtraService[];
  coverImageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  sortOrder: number;
  status: "active" | "maintenance" | "blocked";
  year: number;
  category: string;
  icalImportUrl: string;
};

export function propertyToForm(p: Property | null | undefined): PropertyFormValues {
  return {
    name: p?.name ?? "",
    propertyType: p?.propertyType ?? "standard",
    description: p?.description ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    country: p?.country ?? "LT",
    locationNote: p?.locationNote ?? "",
    doorCode: p?.doorCode ?? "",
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    areaM2: p?.areaM2 ?? null,
    maxGuests: p?.maxGuests ?? 2,
    beds: p?.beds ?? 1,
    rooms: { ...(p?.rooms ?? {}), configs: p?.rooms?.configs ?? [] },
    amenities: p?.amenities ?? [],
    pricePerNight: p?.pricePerNight ?? 60,
    priceTiers: p?.priceTiers ?? [],
    extraServices: p?.extraServices ?? [],
    coverImageUrl: p?.image ?? "",
    imageUrls: p?.images ?? [],
    isActive: p?.isActive ?? true,
    sortOrder: p?.sortOrder ?? 0,
    status: (p?.status as "active" | "maintenance" | "blocked") ?? "active",
    year: p?.year ?? new Date().getFullYear(),
    category: p?.category ?? "",
    icalImportUrl: p?.icalImportUrl ?? "",
  };
}

export function PropertyForm({
  initial,
  onSubmit,
  submitting,
  icalMeta,
}: {
  initial: PropertyFormValues;
  onSubmit: (v: PropertyFormValues) => void;
  submitting?: boolean;
  icalMeta?: {
    lastSyncAt: string | null;
    lastStatus: string | null;
    onSync?: () => void;
    syncing?: boolean;
  };
}) {
  const { t } = useTranslation();
  const [v, setV] = useState<PropertyFormValues>(initial);
  // Kai iš serverio ateina šviežesni duomenys, forma persikrauna (jei vartotojas dar neredagavo).
  const dirtyRef = useRef(false);
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    if (dirtyRef.current) return;
    setV(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);
  const set = <K extends keyof PropertyFormValues>(k: K, val: PropertyFormValues[K]) =>
    setV((s) => {
      dirtyRef.current = true;
      return { ...s, [k]: val };
    });

  const configs: RoomConfig[] = v.rooms.configs ?? [];
  const totalBeds = configs.reduce((sum, c) => sum + (Number(c.beds) || 0), 0);
  const setConfigs = (next: RoomConfig[]) => {
    const bedrooms = next.filter((c) => c.kind.startsWith("bedroom_")).length;
    const living_rooms = next.filter((c) => c.kind === "living_room").length;
    const beds = next.reduce((s, c) => s + (Number(c.beds) || 0), 0);
    dirtyRef.current = true;
    setV((s) => ({
      ...s,
      beds: Math.max(1, beds),
      rooms: { ...s.rooms, configs: next, bedrooms, living_rooms },
    }));
  };
  const updateConfig = (idx: number, patch: Partial<RoomConfig>) =>
    setConfigs(configs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const removeConfig = (idx: number) =>
    setConfigs(configs.filter((_, i) => i !== idx));
  const addConfig = () =>
    setConfigs([...configs, { kind: "bedroom_1", beds: 1, bedType: "double" }]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-6"
    >
      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <label className="text-sm">
          {t("properties.form.name")}
          <input
            required
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.type")}
          <select
            value={v.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          >
            {PROPERTY_TYPES.map((ty) => (
              <option key={ty.value} value={ty.value}>
                {t(ty.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          {t("properties.form.description")}
          <textarea
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          {t("properties.form.address")}
          <input
            value={v.address}
            onChange={(e) => set("address", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.city")}
          <input
            value={v.city}
            onChange={(e) => set("city", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.country")}
          <input
            value={v.country}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
            maxLength={3}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm md:col-span-3">
          {t("properties.form.location")}
          <textarea
            value={v.locationNote}
            onChange={(e) => set("locationNote", e.target.value)}
            rows={3}
            placeholder={t("properties.form.locationPlaceholder")}
            className="mt-1 w-full rounded border px-2 py-1"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("properties.form.locationHelpPre")}{" "}
            <code className="font-mono">{"{{location}}"}</code>.
          </span>
        </label>
        <label className="text-sm md:col-span-3">
          {t("properties.form.doorCode")}
          <input
            value={v.doorCode}
            onChange={(e) => set("doorCode", e.target.value)}
            placeholder={t("properties.form.doorCodePlaceholder")}
            className="mt-1 w-full rounded border px-2 py-1"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("properties.form.doorCodeHelp")}
          </span>
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
        <label className="text-sm">
          {t("properties.form.area")}
          <NumberInput
            min={0}
            placeholder="0"
            value={v.areaM2 ?? null}
            onChange={(n) => set("areaM2", n)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.maxGuests")}
          <NumberInput
            min={1}
            placeholder="1"
            value={v.maxGuests}
            emptyFallback={1}
            onChange={(n) => set("maxGuests", n ?? 1)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.bathrooms")}
          <NumberInput
            min={0}
            placeholder="0"
            value={v.rooms.bathrooms ?? null}
            emptyFallback={0}
            onChange={(n) => set("rooms", { ...v.rooms, bathrooms: n ?? 0 })}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      </section>

      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("properties.form.roomsTitle")}</h3>
          <span className="text-xs text-muted-foreground">{t("properties.form.totalBeds", { count: totalBeds })}</span>
        </div>
        {configs.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">{t("properties.form.noRooms")}</p>
        ) : (
          <div className="mb-3 space-y-2">
            <div className="hidden grid-cols-[1fr_120px_1fr_40px] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
              <div>{t("properties.form.roomType")}</div>
              <div>{t("properties.form.bedCount")}</div>
              <div>{t("properties.form.bedType")}</div>
              <div></div>
            </div>
            {configs.map((c, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 gap-2 rounded border p-2 md:grid-cols-[1fr_120px_1fr_40px] md:items-center md:p-0 md:border-0"
              >
                <select
                  value={c.kind}
                  onChange={(e) => updateConfig(idx, { kind: e.target.value })}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {ROOM_KINDS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.labelKey)}
                    </option>
                  ))}
                </select>
                <NumberInput
                  min={1}
                  placeholder="1"
                  value={c.beds}
                  emptyFallback={1}
                  onChange={(n) => updateConfig(idx, { beds: Math.max(1, n ?? 1) })}
                  className="rounded border px-2 py-1 text-sm"
                />
                <select
                  value={c.bedType}
                  onChange={(e) => updateConfig(idx, { bedType: e.target.value })}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {BED_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {t(b.labelKey)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeConfig(idx)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                  aria-label={t("properties.form.deleteRoom")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addConfig}
          className="text-sm text-primary underline"
        >
          {t("properties.form.addRoom")}
        </button>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("properties.form.amenities")}</h3>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.amenities.includes(a)}
                onChange={(e) =>
                  set(
                    "amenities",
                    e.target.checked
                      ? [...v.amenities, a]
                      : v.amenities.filter((x) => x !== a),
                  )
                }
              />
              {AMENITY_LABEL_KEYS[a] ? t(AMENITY_LABEL_KEYS[a]) : a}
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <label className="text-sm">
          {t("properties.form.pricePerNight")}
          <NumberInput
            step="0.01"
            min={0}
            placeholder="0.00"
            value={v.pricePerNight}
            emptyFallback={0}
            onChange={(n) => set("pricePerNight", n ?? 0)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          {t("properties.form.sortOrder")}
          <NumberInput
            placeholder="0"
            value={v.sortOrder}
            emptyFallback={0}
            onChange={(n) => set("sortOrder", n ?? 0)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm pt-6">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          {t("properties.form.activeLabel")}
        </label>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("properties.form.icalTitle")}</h3>
        <label className="text-sm block">
          {t("properties.form.icalUrl")}
          <input
            type="url"
            placeholder="https://ical.booking.com/v1/export?t=..."
            value={v.icalImportUrl}
            onChange={(e) => set("icalImportUrl", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("properties.form.icalHelp")}
        </p>
        {icalMeta && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {t("properties.form.lastSync")}{" "}
              {icalMeta.lastSyncAt
                ? new Date(icalMeta.lastSyncAt).toLocaleString("lt-LT")
                : "—"}
              {icalMeta.lastStatus ? ` · ${icalMeta.lastStatus}` : ""}
            </span>
            {icalMeta.onSync && (
              <button
                type="button"
                onClick={icalMeta.onSync}
                disabled={icalMeta.syncing}
                className="rounded border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {icalMeta.syncing ? t("properties.form.syncing") : t("properties.form.syncNow")}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("properties.form.tiersTitle")}</h3>
        {v.priceTiers.length > 0 && (
          <div className="mb-1 hidden flex-wrap gap-2 px-1 text-xs font-medium text-muted-foreground md:flex">
            <div className="flex-1">{t("properties.form.tierLabel")}</div>
            <div className="w-24">{t("properties.form.minNights")}</div>
            <div className="w-24">{t("properties.form.maxNights")}</div>
            <div className="w-24">{t("properties.form.pricePerNightShort")}</div>
            <div className="w-4" />
          </div>
        )}
        {v.priceTiers.map((tier, idx) => (
          <div key={idx} className="mb-2 flex flex-wrap gap-2">
            <input
              placeholder={t("properties.form.tierLabel")}
              value={tier.label}
              onChange={(e) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, label: e.target.value };
                set("priceTiers", next);
              }}
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <NumberInput
              placeholder={t("properties.form.minNights")}
              min={1}
              value={tier.minNights}
              emptyFallback={1}
              onChange={(n) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, minNights: n ?? 1 };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <NumberInput
              placeholder={t("properties.form.maxNights")}
              min={1}
              value={tier.maxNights}
              emptyFallback={1}
              onChange={(n) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, maxNights: n ?? 1 };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <NumberInput
              step="0.01"
              min={0}
              placeholder={t("properties.form.pricePerNightShort")}
              value={tier.pricePerNight}
              emptyFallback={0}
              onChange={(n) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, pricePerNight: n ?? 0 };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => set("priceTiers", v.priceTiers.filter((_, i) => i !== idx))}
              className="text-destructive"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-1 text-sm text-primary underline"
          onClick={() =>
            set("priceTiers", [
              ...v.priceTiers,
              { label: "", minNights: 1, maxNights: 1, pricePerNight: v.pricePerNight },
            ])
          }
        >
          {t("properties.form.addTier")}
        </button>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">{t("properties.form.extrasTitle")}</h3>
        {v.extraServices.length > 0 && (
          <div className="mb-1 hidden gap-2 px-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[1fr_1fr_120px_40px]">
            <div>{t("properties.form.serviceName")}</div>
            <div>{t("properties.form.calcType")}</div>
            <div>{t("properties.form.pricePerDay")}</div>
            <div />
          </div>
        )}
        {v.extraServices.map((svc, idx) => {
          const isCustom = !EXTRA_SERVICE_PRESETS.some((p) => p.name === svc.name);
          return (
            <div
              key={idx}
              className="mb-2 grid grid-cols-1 gap-2 rounded border p-2 md:grid-cols-[1fr_1fr_120px_40px] md:items-center md:border-0 md:p-0"
            >
              <div className="flex flex-col gap-1">
                <select
                  value={isCustom ? "__custom" : svc.name}
                  onChange={(e) => {
                    const next = [...v.extraServices];
                    if (e.target.value === "__custom") {
                      next[idx] = { ...svc, name: "" };
                    } else {
                      const preset = EXTRA_SERVICE_PRESETS.find((p) => p.name === e.target.value);
                      next[idx] = {
                        ...svc,
                        name: e.target.value,
                        calc: preset?.calc ?? svc.calc,
                      };
                    }
                    set("extraServices", next);
                  }}
                  className="rounded border px-2 py-1 text-sm"
                >
                  {EXTRA_SERVICE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {t(p.labelKey)}
                    </option>
                  ))}
                  <option value="__custom">{t("properties.form.customOption")}</option>
                </select>
                {isCustom && (
                  <input
                    placeholder={t("properties.form.serviceName")}
                    value={svc.name}
                    onChange={(e) => {
                      const next = [...v.extraServices];
                      next[idx] = { ...svc, name: e.target.value };
                      set("extraServices", next);
                    }}
                    className="rounded border px-2 py-1 text-sm"
                  />
                )}
              </div>
              <select
                value={svc.calc}
                onChange={(e) => {
                  const next = [...v.extraServices];
                  next[idx] = { ...svc, calc: e.target.value as ExtraCalc };
                  set("extraServices", next);
                }}
                className="rounded border px-2 py-1 text-sm"
              >
                {EXTRA_CALCS.map((c) => (
                  <option key={c} value={c}>
                    {t(EXTRA_CALC_LABEL_KEYS[c])}
                  </option>
                ))}
              </select>
              <NumberInput
                step="0.01"
                min={0}
                placeholder="0.00"
                value={svc.pricePerDay}
                emptyFallback={0}
                onChange={(n) => {
                  const next = [...v.extraServices];
                  next[idx] = { ...svc, pricePerDay: n ?? 0 };
                  set("extraServices", next);
                }}
                className="rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "extraServices",
                    v.extraServices.filter((_, i) => i !== idx),
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                aria-label={t("properties.form.deleteService")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="mt-1 text-sm text-primary underline"
          onClick={() =>
            set("extraServices", [
              ...v.extraServices,
              { name: EXTRA_SERVICE_PRESETS[0].name, calc: EXTRA_SERVICE_PRESETS[0].calc, pricePerDay: 0 },
            ])
          }
        >
          {t("properties.form.addService")}
        </button>
      </section>

      <section className="rounded-lg border p-4">
        <ImageUploader
          cover={v.coverImageUrl}
          images={v.imageUrls}
          onChange={({ cover, images }) => {
            dirtyRef.current = true;
            setV((s) => ({ ...s, coverImageUrl: cover, imageUrls: images }));
          }}
          folder="properties"
        />
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
        >
          {submitting ? t("properties.form.saving") : t("properties.form.save")}
        </button>
      </div>
    </form>
  );
}