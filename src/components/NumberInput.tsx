import { useEffect, useRef, useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number | null | undefined;
  /** Kviečiama su skaičiumi arba null, kai laukas tuščias */
  onChange: (value: number | null) => void;
  /** Reikšmė, grąžinama praradus fokusą, kai laukas paliktas tuščias (null = palikti tuščią) */
  emptyFallback?: number | null;
};

/**
 * Skaitinis įvesties laukas, kuris leidžia pilnai ištuštinti reikšmę
 * (be priverstinio „0“) ir pažymi turinį fokusuojant.
 */
export function NumberInput({
  value,
  onChange,
  emptyFallback = null,
  placeholder = "0",
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setText(value === null || value === undefined ? "" : String(value));
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") onChange(null);
        else {
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
      onBlur={(e) => {
        focused.current = false;
        if (text.trim() === "" || Number.isNaN(Number(text))) {
          if (emptyFallback === null || emptyFallback === undefined) {
            setText("");
            onChange(null);
          } else {
            setText(String(emptyFallback));
            onChange(emptyFallback);
          }
        } else {
          const n = Number(text);
          setText(String(n));
          onChange(n);
        }
        onBlur?.(e);
      }}
    />
  );
}
