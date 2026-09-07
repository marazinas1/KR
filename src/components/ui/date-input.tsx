import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DateInputProps {
  value?: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DateInput({
  value,
  onChange,
  placeholder = "yyyy-mm-dd",
  className,
  disabled,
  id,
}: DateInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value ?? "");

  React.useEffect(() => {
    setText(value ?? "");
  }, [value]);

  const date = toDate(value);

  // Mask digit-only input into yyyy-mm-dd with progressive validation.
  const maskInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let out = "";
    for (let i = 0; i < digits.length; i++) {
      const ch = digits[i];
      // Year (positions 0-3): first digit must be 1 or 2
      if (i === 0 && ch !== "1" && ch !== "2") continue;
      // Month tens (position 4): 0 or 1
      if (i === 4 && ch !== "0" && ch !== "1") continue;
      // Month ones (position 5): if tens=1, must be 0-2; if tens=0, must be 1-9
      if (i === 5) {
        const tens = digits[4];
        if (tens === "0" && ch === "0") continue;
        if (tens === "1" && !"012".includes(ch)) continue;
      }
      // Day tens (position 6): 0-3
      if (i === 6 && !"0123".includes(ch)) continue;
      // Day ones (position 7): if tens=0 then 1-9; if tens=3 then 0-1
      if (i === 7) {
        const tens = digits[6];
        if (tens === "0" && ch === "0") continue;
        if (tens === "3" && !"01".includes(ch)) continue;
      }
      out += ch;
      if (out.length === 4 || out.length === 7) out += "-";
    }
    return out;
  };

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange("");
      return;
    }
    const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
    if (isValid(parsed) && format(parsed, "yyyy-MM-dd") === trimmed) {
      onChange(trimmed);
    } else {
      // revert to last valid value
      setText(value ?? "");
    }
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        value={text}
        maxLength={10}
        onChange={(e) => {
          const masked = maskInput(e.target.value);
          setText(masked);
          if (masked.length === 10) {
            const parsed = parse(masked, "yyyy-MM-dd", new Date());
            if (isValid(parsed) && format(parsed, "yyyy-MM-dd") === masked) {
              onChange(masked);
            }
          } else if (masked === "") {
            onChange("");
          }
        }}
        onBlur={(e) => commit(e.target.value)}
        className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 tabular-nums"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 shrink-0"
            aria-label={t("auth.pickDate")}
          >
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              const v = d ? format(d, "yyyy-MM-dd") : "";
              onChange(v);
              setText(v);
              setOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
