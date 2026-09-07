import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { enGB, lt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { parseApiDate, toApiDate, type OccupiedRange } from "@/components/stay/AvailabilityCalendar";
import { useContent, useLocale } from "@/content";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function nightsLabel(count: number, stays: { night: string; nights: string; nightsMany: string }) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod10 === 1 && mod100 !== 11) return stays.night;
  if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) return stays.nightsMany;
  return stays.nights;
}

/** Compact range picker for the booking dialog — same occupied-day rules as the stay page. */
export function BookingDateRange({
  occupied,
  checkin,
  checkout,
  onChange,
  isLoading,
}: {
  occupied: OccupiedRange[];
  checkin: string;
  checkout: string;
  onChange: (checkin: string, checkout: string) => void;
  isLoading?: boolean;
}) {
  const today = useMemo(startOfToday, []);
  const locale = useLocale();
  const { common } = useContent();

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

  const selected = useMemo<DateRange | undefined>(() => {
    const from = checkin ? parseApiDate(checkin) : null;
    const to = checkout ? parseApiDate(checkout) : null;
    if (!from) return undefined;
    return to ? { from, to } : { from, to: undefined };
  }, [checkin, checkout]);

  const nights =
    selected?.from && selected?.to ? differenceInCalendarDays(selected.to, selected.from) : 0;

  return (
    <div className="rounded-md border border-border bg-linen p-3 sm:p-4">
      <Calendar
        mode="range"
        locale={locale === "en" ? enGB : lt}
        weekStartsOn={1}
        numberOfMonths={1}
        selected={selected}
        onSelect={(range) =>
          onChange(range?.from ? toApiDate(range.from) : "", range?.to ? toApiDate(range.to) : "")
        }
        excludeDisabled
        min={2}
        disabled={[{ before: today }, ...occupiedMatchers]}
        modifiers={{ occupied: occupiedMatchers }}
        modifiersClassNames={{ occupied: "day-occupied" }}
        startMonth={today}
        className="pointer-events-auto w-full [--cell-size:2.2rem] sm:[--cell-size:2.5rem]"
        classNames={{
          root: "w-full",
          month: "flex w-full flex-col gap-3",
          caption_label: "font-display text-base font-medium capitalize text-ink",
          weekday: "flex-1 select-none text-[0.65rem] uppercase tracking-[0.12em] text-stone/70",
        }}
      />

      <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
        <div>
          <p className="label-caps text-stone/80">{common.stays.checkin}</p>
          <p className="mt-1 text-sm text-ink">{checkin || "—"}</p>
        </div>
        <div>
          <p className="label-caps text-stone/80">{common.stays.checkout}</p>
          <p className="mt-1 text-sm text-ink">{checkout || "—"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-stone/30" aria-hidden />
          {common.stays.occupied}
        </span>
        {isLoading ? <span>{common.booking.datesLoading}</span> : null}
        {nights > 0 ? (
          <span aria-live="polite" className="text-ink">
            {nights} {nightsLabel(nights, common.stays)}
          </span>
        ) : null}
        {checkin ? (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="ml-auto rounded-md border border-border px-3 py-1 text-xs text-stone transition-colors hover:text-ink"
          >
            {common.stays.clearDates}
          </button>
        ) : null}
      </div>
    </div>
  );
}
