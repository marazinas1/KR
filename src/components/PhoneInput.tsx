import { useMemo } from "react";
import { AsYouType, getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Country labels in Lithuanian for the most common cases; falls back to ISO code.
const COUNTRY_NAMES_LT: Record<string, string> = {
  LT: "Lietuva", LV: "Latvija", EE: "Estija", PL: "Lenkija", DE: "Vokietija",
  GB: "Jungtinė Karalystė", IE: "Airija", NO: "Norvegija", SE: "Švedija",
  FI: "Suomija", DK: "Danija", NL: "Nyderlandai", BE: "Belgija", FR: "Prancūzija",
  ES: "Ispanija", IT: "Italija", AT: "Austrija", CH: "Šveicarija", CZ: "Čekija",
  SK: "Slovakija", HU: "Vengrija", RO: "Rumunija", BG: "Bulgarija", GR: "Graikija",
  PT: "Portugalija", US: "JAV", CA: "Kanada", UA: "Ukraina", BY: "Baltarusija",
  RU: "Rusija", TR: "Turkija", IL: "Izraelis", AE: "JAE", AU: "Australija",
};

function flagEmoji(country: string): string {
  // Convert ISO-2 to regional indicator symbols (works in modern browsers/fonts).
  if (country.length !== 2) return "";
  const A = 0x1f1e6;
  const cps = [country.charCodeAt(0) - 65 + A, country.charCodeAt(1) - 65 + A];
  return String.fromCodePoint(...cps);
}

type Props = {
  id?: string;
  value: string;
  country: CountryCode;
  onChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
};

export function PhoneInput({
  id,
  value,
  country,
  onChange,
  onCountryChange,
  onBlur,
  invalid,
  placeholder,
}: Props) {
  const countries = useMemo(() => {
    const all = getCountries();
    return all
      .map((c) => ({
        code: c,
        name: COUNTRY_NAMES_LT[c] ?? c,
        dial: getCountryCallingCode(c),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "lt"));
  }, []);

  function handleChange(raw: string) {
    // Live-format using AsYouType, keep input free-form (user can type +).
    const formatted = new AsYouType(country).input(raw);
    onChange(formatted);
  }

  return (
    <div className="flex gap-2">
      <Select value={country} onValueChange={(v) => onCountryChange(v as CountryCode)}>
        <SelectTrigger className="w-[160px] shrink-0">
          <SelectValue>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-base leading-none">{flagEmoji(country)}</span>
              <span className="font-mono">+{getCountryCallingCode(country)}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {countries.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="inline-flex items-center gap-2">
                <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground font-mono">+{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={value}
        placeholder={placeholder ?? "6 12 34 567"}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        className={cn(invalid && "border-destructive focus-visible:ring-destructive")}
      />
    </div>
  );
}
