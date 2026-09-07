import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { lt as ltLocale } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Props = {
  /** ISO data formatu YYYY-MM-DD (arba tuščia) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
};

function parseIso(v: string): Date | undefined {
  if (!v) return undefined;
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  required,
  disabled,
  className,
  inputClassName,
  id,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value ?? "");

  React.useEffect(() => {
    setText(value ?? "");
  }, [value]);

  const selected = parseIso(value);

  const commitText = (raw: string) => {
    const v = raw.trim().replace(/[./]/g, "-");
    if (!v) {
      onChange("");
      return;
    }
    // Palaikom ir DD-MM-YYYY įvedimą
    let d = parse(v, "yyyy-MM-dd", new Date());
    if (!isValid(d)) d = parse(v, "dd-MM-yyyy", new Date());
    if (isValid(d)) {
      onChange(format(d, "yyyy-MM-dd"));
    } else {
      setText(value ?? "");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitText(text);
          }
        }}
        className={cn(
          "w-full rounded border bg-background px-2 py-1 pr-8 text-sm",
          inputClassName,
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={t("auth.openCalendar")}
            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (!d) return;
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
            showOutsideDays={false}
            locale={ltLocale}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}