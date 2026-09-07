import { Minus, Plus, Users } from "lucide-react";
import { useState } from "react";

import { plural } from "@/components/search/plural";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useContent } from "@/content";
import { cn } from "@/lib/utils";

export type Guests = { adults: number; children: number; infants: number };

export const DEFAULT_GUESTS: Guests = { adults: 2, children: 0, infants: 0 };

export function GuestsField({
  guests,
  onChange,
  open: openProp,
  onOpenChange,
  className,
}: {
  guests: Guests;
  onChange: (guests: Guests) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const { common } = useContent();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const s = common.search;


  const parts = [
    `${guests.adults} ${plural(guests.adults, s.adultOne, s.adultFew, s.adultMany)}`,
    ...(guests.children > 0
      ? [`${guests.children} ${plural(guests.children, s.childOne, s.childFew, s.childMany)}`]
      : []),
    ...(guests.infants > 0
      ? [`${guests.infants} ${plural(guests.infants, s.infantOne, s.infantFew, s.infantMany)}`]
      : []),
  ];

  const rows: Array<{ key: keyof Guests; label: string; hint: string; min: number }> = [
    { key: "adults", label: s.adults, hint: s.adultsHint, min: 1 },
    { key: "children", label: s.children, hint: s.childrenHint, min: 0 },
    { key: "infants", label: s.infants, hint: s.infantsHint, min: 0 },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-5 py-3.5 text-left transition-colors hover:bg-linen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage",
            className,
          )}
        >
          <Users className="h-5 w-5 shrink-0 text-sage" aria-hidden />
          <span className="min-w-0">
            <span className="label-caps block text-stone/80">{s.guestsLabel}</span>
            <span className="mt-1 block truncate text-sm font-medium text-ink">
              {parts.join(" · ")}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-md border-border bg-warm-white p-5">
        <div className="flex flex-col gap-5">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">{row.label}</p>
                <p className="text-xs text-stone/80">{row.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                <Counter
                  label={`− ${row.label}`}
                  disabled={guests[row.key] <= row.min}
                  onClick={() => onChange({ ...guests, [row.key]: guests[row.key] - 1 })}
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </Counter>
                <span className="w-5 text-center text-sm font-medium text-ink">
                  {guests[row.key]}
                </span>
                <Counter
                  label={`+ ${row.label}`}
                  disabled={guests[row.key] >= 10}
                  onClick={() => onChange({ ...guests, [row.key]: guests[row.key] + 1 })}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </Counter>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-md bg-sage px-5 py-2.5 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep"
        >
          {s.done}
        </button>
      </PopoverContent>
    </Popover>
  );
}

function Counter({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-stone transition-colors hover:border-sage hover:text-sage disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
