import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/DatePicker";
import {
  PERIOD_KEYS,
  PERIOD_LABEL_KEYS,
  formatPeriodLabel,
  resolvePeriod,
  type PeriodKey,
  type ResolvedRange,
} from "@/lib/dashboard-period";

export function PeriodFilter({
  value,
  onChange,
}: {
  value: { period: PeriodKey; from?: string | null; to?: string | null };
  onChange: (v: { period: PeriodKey; from?: string | null; to?: string | null; range: ResolvedRange }) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const range = resolvePeriod(value.period, value.from, value.to);
  const label = formatPeriodLabel(value.period, range, t);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm hover:bg-accent">
          <CalendarIcon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex flex-col">
          {PERIOD_KEYS.filter((k) => k !== "custom").map((k) => (
            <button
              key={k}
              className={`rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${
                value.period === k ? "bg-accent font-medium" : ""
              }`}
              onClick={() => {
                const r = resolvePeriod(k);
                onChange({ period: k, from: r.from, to: r.to, range: r });
                setOpen(false);
              }}
            >
              {t(PERIOD_LABEL_KEYS[k])}
            </button>
          ))}
          <div className="mt-2 border-t pt-2">
            <label className="block text-xs text-muted-foreground">Nuo</label>
            <DatePicker
              className="mt-1"
              value={value.from ?? ""}
              onChange={(val) => {
                const from = val || null;
                const to = value.to ?? null;
                const r: ResolvedRange = { from, to };
                onChange({ period: "custom", from, to, range: r });
              }}
            />
            <label className="mt-2 block text-xs text-muted-foreground">Iki</label>
            <DatePicker
              className="mt-1"
              value={value.to ?? ""}
              onChange={(val) => {
                const to = val || null;
                const from = value.from ?? null;
                const r: ResolvedRange = { from, to };
                onChange({ period: "custom", from, to, range: r });
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
