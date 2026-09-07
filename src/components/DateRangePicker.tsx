import * as React from "react";
import { format } from "date-fns";
import { lt as ltLocale } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type DateRangeValue = { from?: Date; to?: Date };

type Props = {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  disabledDates?: Date[];
  summary?: string;
  placeholder?: string;
  dateLocale?: Locale;
  className?: string;
  allowPast?: boolean;
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function DateRangePicker({
  value,
  onChange,
  disabledDates = [],
  summary,
  placeholder = "Pasirinkite datas",
  dateLocale = ltLocale,
  className,
  allowPast = false,
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const disabledKeys = React.useMemo(
    () => new Set(disabledDates.map((d) => format(startOfDay(d), "yyyy-MM-dd"))),
    [disabledDates],
  );

  const today = startOfDay(new Date());

  const range: DateRange | undefined = value.from
    ? { from: value.from, to: value.to }
    : undefined;

  const rangeCrossesDisabled = (from: Date, to: Date) => {
    const a = startOfDay(from);
    const b = startOfDay(to);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      if (disabledKeys.has(format(d, "yyyy-MM-dd"))) return true;
    }
    return false;
  };

  // Pilnai kontroliuojam pasirinkimą — kad galėtume vėl iš naujo paspausti
  // ant pirmos datos ir tęsti iki vėlesnės.
  const handleSelect = (
    _next: DateRange | undefined,
    selectedDay: Date | undefined,
  ) => {
    if (!selectedDay) return;
    const day = startOfDay(selectedDay);

    // Pradžia arba pilnas intervalas jau yra → naujas pasirinkimas
    if (!value.from || (value.from && value.to)) {
      onChange({ from: day, to: undefined });
      return;
    }

    // Turim tik NUO — pridedam IKI
    if (day.getTime() === value.from.getTime()) {
      // tas pats kaip NUO → 1 dienos nuoma
      onChange({ from: value.from, to: day });
      setOpen(false);
      return;
    }
    if (day < value.from) {
      // anksčiau už NUO → pradedam iš naujo
      onChange({ from: day, to: undefined });
      return;
    }
    // vėlesnė data — tikrinam ar tarp nėra užimtų
    if (rangeCrossesDisabled(value.from, day)) {
      onChange({ from: day, to: undefined });
      return;
    }
    onChange({ from: value.from, to: day });
    setOpen(false);
  };

  const triggerLabel = value.from && value.to
    ? `${format(value.from, "yyyy-MM-dd")} → ${format(value.to, "yyyy-MM-dd")}${summary ? ` · ${summary}` : ""}`
    : value.from
    ? `${format(value.from, "yyyy-MM-dd")} → …`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-left text-sm font-medium hover:border-primary/50 transition",
            !value.from && "text-muted-foreground font-normal",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{triggerLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={8}
      >
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          showOutsideDays={false}
          locale={dateLocale}
          disabled={(d) => {
            if (!allowPast && d < today) return true;
            return disabledKeys.has(format(startOfDay(d), "yyyy-MM-dd"));
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto [--cell-size:2.6rem]")}
          classNames={{
            range_start:
              "!rounded-full [&_button]:!bg-primary [&_button]:!text-primary-foreground [&_button]:!rounded-full hover:[&_button]:!bg-primary",
            range_end:
              "!rounded-full [&_button]:!bg-primary [&_button]:!text-primary-foreground [&_button]:!rounded-full hover:[&_button]:!bg-primary",
            range_middle:
              "!bg-primary/15 !text-foreground !rounded-none [&_button]:!bg-transparent [&_button]:!text-foreground [&_button]:!rounded-none hover:[&_button]:!bg-primary/25",
            today:
              "!bg-transparent !text-foreground [&_button]:ring-1 [&_button]:ring-primary [&_button]:!rounded-full",
            disabled:
              "!text-muted-foreground/70 !opacity-100 line-through decoration-muted-foreground/70 [&_button]:!bg-muted/60 [&_button]:!text-muted-foreground/70 [&_button]:line-through pointer-events-none",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
