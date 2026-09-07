import { useTranslation } from "react-i18next";
import { useState } from "react";
import { format, parse } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import type { Property } from "@/lib/properties";
import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_LABEL_KEYS,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL_KEYS,
  BOOKING_SOURCE_VALUES,
  checkBookingConflicts,
  listOccupiedRanges,
  type BookingInput,
} from "@/lib/bookings.functions";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DatePicker } from "@/components/DatePicker";
import { GuestsPicker } from "@/components/GuestsPicker";
import { NumberInput } from "@/components/NumberInput";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/TimeInput";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXTRA_CALC_LABEL_KEYS, priceForNights } from "@/lib/properties";
import { extraLineTotal, nightsBetweenDates, type ExtraCalcKind } from "@/lib/booking-extras";

export type BookingFormValues = Omit<BookingInput, "source" | "status"> & {
  source: (typeof BOOKING_SOURCE_VALUES)[number];
  status: (typeof BOOKING_STATUSES)[number];
};

export function defaultBookingForm(props: Property[] = []): BookingFormValues {
  return {
    property_id: props[0]?.id ?? "",
    date_from: "",
    date_to: "",
    check_in_time: "15:00",
    check_out_time: "11:00",
    location: "",
    guests: 1,
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    total_guests: 1,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_country: "Lietuva",
    customer_id_code: "",
    client_type: "person",
    birth_date: null,
    company_name: "",
    company_code: "",
    is_vat_payer: false,
    vat_number: "",
    source: "phone",
    status: "pending",
    total_amount: 0,
    note: "",
    extras: [],
    extras_total: 0,
  };
}

function computeTotalsFor(state: BookingFormValues, properties: Property[]) {
  const prop = properties.find((p) => p.id === state.property_id);
  const defined = prop?.extraServices ?? [];
  const days = nightsBetweenDates(state.date_from, state.date_to);
  const ctx = {
    adults: state.adults_count,
    children: state.children_count,
    infants: state.infants_count,
    days,
  };
  const extras = state.extras
    .map((e) => {
      const match = defined.find((d) => d.name === e.name);
      if (!match) return null;
      return {
        name: match.name,
        calc: match.calc as ExtraCalcKind,
        pricePerDay: Number(match.pricePerDay) || 0,
        amount: extraLineTotal(match.calc as ExtraCalcKind, Number(match.pricePerDay) || 0, ctx),
      };
    })
    .filter(Boolean) as BookingFormValues["extras"];
  const extras_total = extras.reduce((s, e) => s + e.amount, 0);
  const stay =
    prop && days > 0
      ? priceForNights({ pricePerNight: prop.pricePerNight, priceTiers: prop.priceTiers ?? [] }, days)
      : { total: 0, pricePerNight: prop?.pricePerNight ?? 0, tier: null };
  const stayTotal = Number((stay.total || 0).toFixed(2));
  const computed = Number((stayTotal + extras_total).toFixed(2));
  return { extras, extras_total, days, stayTotal, nightly: stay.pricePerNight, computed };
}

export function BookingForm({
  properties,
  initial,
  onSubmit,
  submitting,
  bookingId,
}: {
  properties: Property[];
  initial: BookingFormValues;
  onSubmit: (v: BookingFormValues) => void;
  submitting?: boolean;
  bookingId?: string;
}) {
  const { t: tr } = useTranslation();
  const [v, setV] = useState<BookingFormValues>(() => {
    if (Number(initial.total_amount) > 0) return initial;
    const t = computeTotalsFor(initial, properties);
    return {
      ...initial,
      extras: t.extras,
      extras_total: t.extras_total,
      total_amount: Math.max(0, t.computed),
    };
  });
  const navigate = useNavigate();
  const [manualTotal, setManualTotal] = useState<boolean>(Number(initial.total_amount) > 0);
  const set = <K extends keyof BookingFormValues>(k: K, val: BookingFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const parseDate = (s: string) => (s ? parse(s, "yyyy-MM-dd", new Date()) : undefined);
  const range = { from: parseDate(v.date_from), to: parseDate(v.date_to) };
  const isCompany = v.client_type === "company";

  const checkConflicts = useServerFn(checkBookingConflicts);
  const canCheck = Boolean(v.property_id && v.date_from && v.date_to && v.date_to > v.date_from);
  const { data: conflicts = [] } = useQuery({
    queryKey: ["booking-conflicts", v.property_id, v.date_from, v.date_to, bookingId ?? ""],
    enabled: canCheck,
    queryFn: () =>
      checkConflicts({
        data: {
          property_id: v.property_id,
          date_from: v.date_from,
          date_to: v.date_to,
          ...(bookingId ? { excludeId: bookingId } : {}),
        },
      }),
  });
  const hasConflict = canCheck && conflicts.length > 0;

  const fetchOccupied = useServerFn(listOccupiedRanges);
  const { data: occupiedRows = [] } = useQuery({
    queryKey: ["booking-occupied", v.property_id, bookingId ?? ""],
    enabled: Boolean(v.property_id),
    queryFn: () =>
      fetchOccupied({
        data: {
          property_id: v.property_id,
          ...(bookingId ? { excludeId: bookingId } : {}),
        },
      }),
  });
  // Užimtos naktys: nuo atvykimo iki išvykimo dienos (išvykimo diena laisva)
  const occupiedDates = (occupiedRows as any[]).flatMap((r) => {
    const start = parse(r.date_from, "yyyy-MM-dd", new Date());
    const end = parse(r.date_to, "yyyy-MM-dd", new Date());
    const out: Date[] = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  });

  const selectedProperty = properties.find((p) => p.id === v.property_id);
  const availableExtras = selectedProperty?.extraServices ?? [];
  const nights = nightsBetweenDates(v.date_from, v.date_to);
  const extrasCtx = {
    adults: v.adults_count,
    children: v.children_count,
    infants: v.infants_count,
    days: nights,
  };
  const lineAmount = (svc: { calc: ExtraCalcKind | string; pricePerDay: number }) =>
    extraLineTotal(svc.calc as ExtraCalcKind, Number(svc.pricePerDay) || 0, extrasCtx);

  const computeTotals = (state: BookingFormValues) => computeTotalsFor(state, properties);

  const recalc = (state: BookingFormValues, forceTotal = false): BookingFormValues => {
    const { extras, extras_total, computed } = computeTotals(state);
    return {
      ...state,
      extras,
      extras_total,
      total_amount:
        manualTotal && !forceTotal ? state.total_amount : Math.max(0, computed),
    };
  };

  const totals = computeTotals(v);

  const toggleExtra = (name: string, checked: boolean) =>
    setV((s) =>
      recalc({
        ...s,
        extras: checked
          ? [...s.extras, { name, calc: "flat_per_day", pricePerDay: 0, amount: 0 }]
          : s.extras.filter((e) => e.name !== name),
      }),
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hasConflict) return;
        const totals = {
          total_guests: v.adults_count + v.children_count + v.infants_count,
          guests: v.adults_count + v.children_count + v.infants_count,
        };
        onSubmit(
          v.client_type === "company"
            ? {
                ...v,
                ...totals,
                birth_date: null,
                vat_number: v.is_vat_payer ? v.vat_number : "",
              }
            : {
                ...v,
                ...totals,
                company_name: "",
                company_code: "",
                is_vat_payer: false,
                vat_number: "",
              },
        );
      }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* 1. Rezervacijos informacija */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("bookings.form.sectionInfo")}</CardTitle>
          <CardDescription>{tr("bookings.form.sectionInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="property">{tr("bookings.form.property")}</Label>
            <Select
              value={v.property_id || undefined}
              onValueChange={(val) =>
                setV((s) => recalc({ ...s, property_id: val, extras: [] }))
              }
            >
              <SelectTrigger id="property" className="w-full">
                <SelectValue placeholder={tr("bookings.form.selectProperty")} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{tr("bookings.form.dates")}</Label>
            <DateRangePicker
              value={range}
              placeholder={tr("bookings.form.selectDates")}
              allowPast
              disabledDates={occupiedDates}
              onChange={(r) =>
                setV((s) =>
                  recalc({
                    ...s,
                    date_from: r.from ? format(r.from, "yyyy-MM-dd") : "",
                    date_to: r.to ? format(r.to, "yyyy-MM-dd") : "",
                  }),
                )
              }
            />
            {nights > 0 && (
              <p className="text-xs text-muted-foreground">{tr("bookings.form.nights", { count: nights })}</p>
            )}
            {hasConflict && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {tr("bookings.form.conflict", {
                  list: conflicts
                    .map((c: any) => `${c.customer_name || "—"} (${c.date_from} → ${c.date_to})`)
                    .join(", "),
                })}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="check-in">{tr("bookings.form.checkIn")}</Label>
              <TimeInput
                id="check-in"
                placeholder="15:00"
                value={v.check_in_time}
                onChange={(val: string) => set("check_in_time", val)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="check-out">{tr("bookings.form.checkOut")}</Label>
              <TimeInput
                id="check-out"
                placeholder="11:00"
                value={v.check_out_time}
                onChange={(val: string) => set("check_out_time", val)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-xs">
            <Label>{tr("bookings.form.guestsCount")}</Label>
            <GuestsPicker
              value={{ adults: v.adults_count, children: v.children_count, infants: v.infants_count }}
              onChange={(g) =>
                setV((s) =>
                  recalc({
                    ...s,
                    adults_count: g.adults,
                    children_count: g.children,
                    infants_count: g.infants,
                    total_guests: g.adults + g.children + g.infants,
                    guests: g.adults + g.children + g.infants,
                  }),
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Kliento duomenys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("bookings.form.sectionClient")}</CardTitle>
          <CardDescription>{tr("bookings.form.sectionClientDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label>{tr("bookings.form.clientType")}</Label>
            <ToggleGroup
              type="single"
              value={v.client_type}
              onValueChange={(val) => {
                if (val) set("client_type", val as BookingFormValues["client_type"]);
              }}
              variant="outline"
              className="w-fit"
            >
              <ToggleGroupItem value="person" className="px-4">
                {tr("bookings.form.person")}
              </ToggleGroupItem>
              <ToggleGroupItem value="company" className="px-4">
                {tr("bookings.form.company")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">{tr("bookings.form.name")} {isCompany ? "" : "*"}</Label>
              <Input
                id="name"
                required={!isCompany}
                placeholder={tr("bookings.form.namePlaceholder")}
                value={v.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{tr("bookings.form.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder={tr("bookings.form.emailPlaceholder")}
                value={v.customer_email}
                onChange={(e) => set("customer_email", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{tr("bookings.form.phone")}</Label>
              <Input
                id="phone"
                required
                placeholder={tr("bookings.form.phonePlaceholder")}
                value={v.customer_phone}
                onChange={(e) => set("customer_phone", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">
                {isCompany ? tr("bookings.form.companyAddress") : tr("bookings.form.address")}
              </Label>
              <Input
                id="address"
                placeholder={tr("bookings.form.addressPlaceholder")}
                value={v.customer_address}
                onChange={(e) => set("customer_address", e.target.value)}
              />
            </div>
            {!isCompany && (
              <div className="grid gap-2">
                <Label>{tr("bookings.form.birthDate")}</Label>
                <DatePicker
                  value={v.birth_date ?? ""}
                  onChange={(val) => set("birth_date", val || null)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="country">{tr("bookings.form.country")}</Label>
              <Input
                id="country"
                placeholder={tr("bookings.form.countryPlaceholder")}
                value={v.customer_country}
                onChange={(e) => set("customer_country", e.target.value)}
              />
            </div>
          </div>

          {isCompany && (
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="company-name">{tr("bookings.form.companyName")}</Label>
                <Input
                  id="company-name"
                  required
                  placeholder={tr("bookings.form.companyNamePlaceholder")}
                  value={v.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-code">{tr("bookings.form.companyCode")}</Label>
                <Input
                  id="company-code"
                  required
                  placeholder="300000000"
                  value={v.company_code}
                  onChange={(e) => set("company_code", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="vat"
                  checked={v.is_vat_payer}
                  onCheckedChange={(c) => set("is_vat_payer", c === true)}
                />
                <Label htmlFor="vat" className="font-normal">
                  {tr("bookings.form.isVatPayer")}
                </Label>
              </div>
              {v.is_vat_payer && (
                <div className="grid gap-2">
                  <Label htmlFor="vat-number">{tr("bookings.form.vatNumber")}</Label>
                  <Input
                    id="vat-number"
                    required
                    placeholder="LT100000000010"
                    value={v.vat_number}
                    onChange={(e) => set("vat_number", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Finansai ir sistemos parametrai */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("bookings.form.sectionFinance")}</CardTitle>
          <CardDescription>{tr("bookings.form.sectionFinanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {availableExtras.length > 0 && (
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">{tr("bookings.form.extras")}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tr("bookings.form.extrasHint", { nights })}
              </p>
              <div className="mt-2 divide-y">
                {availableExtras.map((svc) => {
                  const checked = v.extras.some((e) => e.name === svc.name);
                  return (
                    <label
                      key={svc.name}
                      className="flex flex-wrap items-center gap-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleExtra(svc.name, c === true)}
                      />
                      <span className="font-medium">{svc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {EXTRA_CALC_LABEL_KEYS[svc.calc] ? tr(EXTRA_CALC_LABEL_KEYS[svc.calc]) : svc.calc} ·{" "}
                        {Number(svc.pricePerDay).toFixed(2)} {tr("bookings.form.perDay")}
                      </span>
                      <span className="ml-auto tabular-nums">{lineAmount(svc).toFixed(2)} €</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 text-right text-sm font-medium">
                {tr("bookings.form.extrasTotal", { amount: (v.extras_total ?? 0).toFixed(2) })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="source">{tr("bookings.form.source")}</Label>
              <Select value={v.source} onValueChange={(val) => set("source", val as any)}>
                <SelectTrigger id="source" className="w-full">
                  <SelectValue placeholder={tr("bookings.form.selectSource")} />
                </SelectTrigger>
                <SelectContent>
                  {(BOOKING_SOURCES as readonly string[])
                    .concat(v.source === "direct" ? ["direct"] : [])
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {BOOKING_SOURCE_LABEL_KEYS[s] ? tr(BOOKING_SOURCE_LABEL_KEYS[s]) : s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">{tr("bookings.form.status")}</Label>
              <Select value={v.status} onValueChange={(val) => set("status", val as any)}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder={tr("bookings.form.selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {BOOKING_STATUS_LABEL_KEYS[s] ? tr(BOOKING_STATUS_LABEL_KEYS[s]) : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="total">{tr("bookings.form.total")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
              </span>
              <NumberInput
                id="total"
                step="0.01"
                min={0}
                placeholder="0.00"
                value={v.total_amount}
                emptyFallback={0}
                onChange={(n) => {
                  setManualTotal(true);
                  set("total_amount", n ?? 0);
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent py-1 pl-7 pr-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {tr("bookings.form.computed", {
                  total: totals.computed.toFixed(2),
                  stay: totals.stayTotal.toFixed(2),
                  nightly: Number(totals.nightly || 0).toFixed(2),
                  days: totals.days,
                  extras:
                    totals.extras_total > 0
                      ? tr("bookings.form.computedExtras", {
                          amount: totals.extras_total.toFixed(2),
                        })
                      : "",
                })}
              </span>
              {manualTotal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setManualTotal(false);
                    setV((s) => recalc(s, true));
                  }}
                >
                  {tr("bookings.form.recalculate")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">{tr("bookings.form.note")}</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder={tr("bookings.form.notePlaceholder")}
              value={v.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-end gap-2">
        {hasConflict && (
          <p className="text-sm text-destructive">
            {tr("bookings.form.conflictSave")}
          </p>
        )}
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => navigate({ to: "/admin/bookings" })}
          >
            {tr("bookings.form.cancel")}
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting || hasConflict}>
            {submitting ? tr("bookings.form.saving") : tr("bookings.form.submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}