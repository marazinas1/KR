import * as React from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function normalize(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  let h = 0;
  let m = 0;
  if (digits.length <= 2) {
    h = Number(digits);
  } else {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  }
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimeInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value?: string | null;
  onChange?: (value: string) => void;
}

/** 24 val. formato laiko laukas (be AM/PM). */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange, className, onBlur, placeholder = "14:00", ...props }, ref) => {
    const [text, setText] = React.useState(value ?? "");

    React.useEffect(() => {
      setText(value ?? "");
    }, [value]);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder={placeholder}
          className={cn("pr-9", className)}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const digits = raw.replace(/\D/g, "");
            if (digits.length === 4) {
              const next = normalize(raw);
              setText(next);
              onChange?.(next);
            }
          }}
          onBlur={(e) => {
            const next = normalize(text);
            setText(next);
            if (next !== (value ?? "")) onChange?.(next);
            onBlur?.(e);
          }}
        />
        <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);
TimeInput.displayName = "TimeInput";
