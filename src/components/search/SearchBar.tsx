import { format } from "date-fns";
import { enGB, lt as ltLocale } from "date-fns/locale";
import { Search } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangeField, nightsBetween } from "@/components/search/DateRangeField";
import { DEFAULT_GUESTS, GuestsField, type Guests } from "@/components/search/GuestsField";
import { useLocaleNavigate } from "@/components/site/LocaleLink";
import { toApiDate } from "@/components/stay/AvailabilityCalendar";
import { useContent, useLocale } from "@/content";
import { cn } from "@/lib/utils";

export type SearchValues = {
  nuo?: string;
  iki?: string;
  suauge?: number;
  vaikai?: number;
  kudikiai?: number;
};

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * Shared availability search: one range calendar + guests + CTA.
 * `hero` is the big landing card, `compact` sits on the results page
 * with the calendar always visible.
 */
export function SearchBar({
  variant = "hero",
  initial,
  onSearch,
  className,
}: {
  variant?: "hero" | "compact";
  initial?: SearchValues;
  /** When set, the parent handles the search instead of navigating. */
  onSearch?: (values: Required<Pick<SearchValues, "nuo" | "iki">> & SearchValues) => void;
  className?: string;
}) {
  const { common } = useContent();
  const locale = useLocale();
  const dateLocale = locale === "en" ? enGB : ltLocale;
  const navigate = useLocaleNavigate();
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = toDate(initial?.nuo);
    const to = toDate(initial?.iki);
    return from ? ({ from, ...(to ? { to } : {}) } as DateRange) : undefined;
  });
  const [guests, setGuests] = useState<Guests>({
    adults: initial?.suauge ?? DEFAULT_GUESTS.adults,
    children: initial?.vaikai ?? 0,
    infants: initial?.kudikiai ?? 0,
  });

  const nights = nightsBetween(range);

  const submit = () => {
    setDatesOpen(false);
    setGuestsOpen(false);
    if (!range?.from || !range?.to) {
      setDatesOpen(true);
      return;
    }
    const values = {
      nuo: toApiDate(range.from),
      iki: toApiDate(range.to),
      suauge: guests.adults,
      vaikai: guests.children,
      kudikiai: guests.infants,
    };
    if (onSearch) {
      onSearch(values);
      return;
    }
    void navigate({
      to: "/laisvi-kambariai",
      search: values,
    } as unknown as Parameters<typeof navigate>[0]);
  };

  const openGuests = (open: boolean) => {
    if (open) setDatesOpen(false);
    setGuestsOpen(open);
  };

  const openDates = (open: boolean) => {
    if (open) setGuestsOpen(false);
    setDatesOpen(open);
  };

  const submitButton = (
    <button
      type="submit"
      className="inline-flex items-center justify-center gap-2 rounded-md bg-clay px-7 py-4 text-sm font-medium text-ink transition-colors hover:bg-sage hover:text-warm-white"
    >
      <Search className="h-4 w-4" aria-hidden />
      {common.search.submit}
    </button>
  );

  if (variant === "compact") {
    const day = (value: Date | undefined) =>
      value ? format(value, "d MMM yyyy", { locale: dateLocale }) : "—";
    const shortDay = (value: Date | undefined) =>
      value ? format(value, "MM-dd", { locale: dateLocale }) : "—";

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={cn(
          "flex flex-col gap-4 rounded-md border border-border bg-warm-white p-4 text-left shadow-soft",
          className,
        )}
      >
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <Summary
            label={common.search.checkIn}
            value={day(range?.from)}
            shortValue={shortDay(range?.from)}
          />
          <Summary
            label={common.search.checkOut}
            value={day(range?.to)}
            shortValue={shortDay(range?.to)}
          />
          <Summary label={common.search.nightsLabel} value={String(nights)} align="right" />
        </div>


        <DateRangeField range={range} onChange={setRange} inline months={1} />

        <div className="rounded-md border border-border">
          <GuestsField
            guests={guests}
            onChange={setGuests}
            open={guestsOpen}
            onOpenChange={openGuests}
          />
        </div>

        {submitButton}
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn(
        "grid gap-2 rounded-md bg-warm-white p-3 shadow-lift sm:grid-cols-[1.4fr_1fr_auto] sm:items-center",
        className,
      )}
    >
      <DateRangeField range={range} onChange={setRange} open={datesOpen} onOpenChange={openDates} />
      <div className="sm:border-l sm:border-border">
        <GuestsField
          guests={guests}
          onChange={setGuests}
          open={guestsOpen}
          onOpenChange={openGuests}
        />
      </div>
      {submitButton}
    </form>
  );
}

function Summary({
  label,
  value,
  shortValue,
  align = "left",
}: {
  label: string;
  value: string;
  shortValue?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0 px-2", align === "right" && "text-right")}>
      <span className="label-caps block text-stone/80">{label}</span>
      <span className="mt-1 block truncate text-sm font-medium text-ink">
        {/* short form avoids truncation on narrow phones */}
        <span className="sm:hidden">{shortValue ?? value}</span>
        <span className="hidden sm:inline">{value}</span>
      </span>
    </div>
  );
}

