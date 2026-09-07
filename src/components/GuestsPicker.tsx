import * as React from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type GuestCounts = {
  adults: number;
  children: number;
  infants: number;
};

export function guestsSummary(v: GuestCounts, t: (key: string, opts?: Record<string, unknown>) => string) {
  const parts: string[] = [];
  parts.push(t("guests.summaryAdults", { count: v.adults }));
  if (v.children > 0) parts.push(t("guests.summaryChildren", { count: v.children }));
  if (v.infants > 0) parts.push(t("guests.summaryInfants", { count: v.infants }));
  return parts.join(", ");
}

function Row({
  title,
  subtitle,
  value,
  min = 0,
  max = 30,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("guests.decrease", { title })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-foreground disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={t("guests.increase", { title })}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border text-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function GuestsPicker({
  value,
  onChange,
  className,
  buttonClassName,
  maxTotal = 30,
}: {
  value: GuestCounts;
  onChange: (v: GuestCounts) => void;
  className?: string;
  buttonClassName?: string;
  maxTotal?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const set = (k: keyof GuestCounts, n: number) => onChange({ ...value, [k]: n });

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded border bg-background px-2 py-1 text-left text-sm",
              buttonClassName,
            )}
          >
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{guestsSummary(value, t)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-3" align="start" sideOffset={8}>
          <Row
            title={t("guests.adults")}
            subtitle={t("guests.adultsHint")}
            value={value.adults}
            min={1}
            max={maxTotal}
            onChange={(n) => set("adults", n)}
          />
          <Row
            title={t("guests.children")}
            subtitle={t("guests.childrenHint")}
            value={value.children}
            max={maxTotal}
            onChange={(n) => set("children", n)}
          />
          <Row
            title={t("guests.infants")}
            subtitle={t("guests.infantsHint")}
            value={value.infants}
            max={maxTotal}
            onChange={(n) => set("infants", n)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
