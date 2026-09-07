import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { enGB, lt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Enso } from "@/components/site/Enso";
import { useContent, useLocale } from "@/content";
import { cn } from "@/lib/utils";

export type OccupiedRange = { date_from: string; date_to: string };

/** Parses a YYYY-MM-DD API date as a local calendar day (no timezone drift). */
export function parseApiDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function nightsLabel(count: number, stays: { night: string; nights: string; nightsMany: string }): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod10 === 1 && mod100 !== 11) return stays.night;
  if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) return stays.nightsMany;
  return stays.nights;
}

export function AvailabilityCalendar({
  occupied,
  range,
  onRangeChange,
  className,
}: {
  occupied: OccupiedRange[];
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}) {
  const today = useMemo(startOfToday, []);
  const locale = useLocale();
  const common = useContent().common;

  const occupiedMatchers = useMemo(
    () =>
      occupied
        .map((entry) => {
          const from = parseApiDate(entry.date_from);
          const to = parseApiDate(entry.date_to);
          if (!from || !to) return null;
          return { from, to };
        })
        .filter((value): value is { from: Date; to: Date } => value !== null),
    [occupied],
  );

  const nights =
    range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;

  return (
    <div className={cn("rounded-md bg-warm-white p-6 shadow-soft sm:p-8", className)}>
      <div className="flex items-start gap-4">
        <Enso className="mt-1 hidden h-8 w-8 shrink-0 text-sage sm:block" />
        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {common.stays.availabilityTitle}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-stone">
            {common.stays.availabilityLead}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Calendar
          mode="range"
          locale={locale === "en" ? enGB : lt}
          weekStartsOn={1}
          numberOfMonths={1}
          selected={range}
          onSelect={onRangeChange}
          excludeDisabled
          min={2}
          disabled={[{ before: today }, ...occupiedMatchers]}
          modifiers={{ occupied: occupiedMatchers }}
          modifiersClassNames={{ occupied: "day-occupied" }}
          startMonth={today}
          className="pointer-events-auto w-full [--cell-size:2.6rem] sm:[--cell-size:2.9rem]"
          classNames={{
            root: "w-full",
            month: "flex w-full flex-col gap-4",
            caption_label: "font-display text-lg font-medium capitalize text-ink",
            weekday: "flex-1 select-none text-[0.7rem] uppercase tracking-[0.12em] text-stone/70",
          }}
        />
      </div>

      <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <div>
          <p className="label-caps text-stone/80">{common.stays.checkin}</p>
          <p className="mt-1 font-display text-lg font-medium text-ink">
            {range?.from ? format(range.from, "yyyy-MM-dd") : "—"}
          </p>
        </div>
        <div>
          <p className="label-caps text-stone/80">{common.stays.checkout}</p>
          <p className="mt-1 font-display text-lg font-medium text-ink">
            {range?.to ? format(range.to, "yyyy-MM-dd") : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden />
          {common.stays.selected}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-stone/30" aria-hidden />
          {common.stays.occupied}
        </span>
        {nights > 0 ? (
          <span aria-live="polite" className="text-ink">
            {nights} {nightsLabel(nights, common.stays)}
          </span>
        ) : null}
        {range?.from ? (
          <button
            type="button"
            onClick={() => onRangeChange(undefined)}
            className="ml-auto rounded-md border border-border px-4 py-1.5 text-xs text-stone transition-colors hover:text-ink"
          >
            {common.stays.clearDates}
          </button>
        ) : null}
      </div>
    </div>
  );
}