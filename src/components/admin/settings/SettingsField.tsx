import { useTranslation } from "react-i18next";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FieldDef } from "@/lib/property-settings";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/TimeInput";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsField({
  field,
  control,
  disabled,
  error,
}: {
  field: FieldDef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  disabled?: boolean;
  error?: string;
}) {
  const { t } = useTranslation();
  const id = `field-${field.name}`;
  const span = field.colSpan === 2 ? "md:col-span-2" : "";

  return (
    <Controller
      control={control}
      name={field.name as string}
      render={({ field: rhf }) => {
        const common = { id, disabled, "aria-invalid": Boolean(error) };

        if (field.type === "switch") {
          return (
            <div className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${span}`}>
              <div className="min-w-0">
                <Label htmlFor={id} className="text-sm font-medium">
                  {t(field.labelKey)}
                </Label>
                {field.helpKey && (
                  <p className="mt-1 text-xs text-muted-foreground">{t(field.helpKey)}</p>
                )}
              </div>
              <Switch
                id={id}
                checked={Boolean(rhf.value)}
                onCheckedChange={rhf.onChange}
                disabled={disabled}
              />
            </div>
          );
        }

        if (field.type === "checkboxGroup") {
          const selected: string[] = Array.isArray(rhf.value) ? rhf.value : [];
          return (
            <div className={`space-y-2 ${span}`}>
              <Label className="text-sm font-medium">{t(field.labelKey)}</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(field.options ?? []).map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <Checkbox
                      checked={selected.includes(o.value)}
                      disabled={disabled}
                      onCheckedChange={(c) =>
                        rhf.onChange(
                          c
                            ? [...selected, o.value]
                            : selected.filter((v) => v !== o.value),
                        )
                      }
                    />
                    {o.labelKey ? t(o.labelKey) : o.label}
                  </label>
                ))}
              </div>
              {field.helpKey && <p className="text-xs text-muted-foreground">{t(field.helpKey)}</p>}
              {error && <p className="text-xs text-destructive">{t(error)}</p>}
            </div>
          );
        }

        return (
          <div className={`space-y-1.5 ${span}`}>
            <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
              {t(field.labelKey)}
              {field.unitKey && (
                <span className="text-xs font-normal text-muted-foreground">({t(field.unitKey)})</span>
              )}
            </Label>

            {field.type === "select" ? (
              <Select
                value={String(rhf.value ?? "")}
                onValueChange={rhf.onChange}
                disabled={disabled}
              >
                <SelectTrigger id={id} aria-invalid={Boolean(error)}>
                  <SelectValue placeholder={t("settings.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.labelKey ? t(o.labelKey) : o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "textarea" ? (
              <Textarea
                {...common}
                rows={5}
                value={String(rhf.value ?? "")}
                onChange={(e) => rhf.onChange(e.target.value)}
              />
            ) : field.type === "color" ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id={id}
                  disabled={disabled}
                  value={String(rhf.value ?? "#000000")}
                  onChange={(e) => rhf.onChange(e.target.value.toUpperCase())}
                  className="h-9 w-14 cursor-pointer rounded border bg-background p-1"
                />
                <Input
                  value={String(rhf.value ?? "")}
                  disabled={disabled}
                  onChange={(e) => rhf.onChange(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
            ) : field.type === "number" ? (
              <Input
                {...common}
                type="number"
                inputMode="decimal"
                step={field.step ?? 1}
                min={field.min}
                max={field.max}
                value={rhf.value === null || rhf.value === undefined ? "" : String(rhf.value)}
                onFocus={(e) => {
                  if (e.target.value === "0") e.target.select();
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    rhf.onChange(field.nullable ? null : "");
                    return;
                  }
                  const n = Number(raw);
                  rhf.onChange(Number.isNaN(n) ? raw : n);
                }}
                onBlur={() => {
                  if (rhf.value === "" || rhf.value === undefined) {
                    rhf.onChange(field.nullable ? null : 0);
                  }
                  rhf.onBlur();
                }}
              />
            ) : field.type === "time" ? (
              <TimeInput
                {...common}
                value={String(rhf.value ?? "")}
                onChange={(val: string) => rhf.onChange(val)}
              />
            ) : (
              <Input
                {...common}
                type={field.type === "text" ? "text" : field.type}
                value={String(rhf.value ?? "")}
                onChange={(e) => rhf.onChange(e.target.value)}
              />
            )}

            {field.helpKey && <p className="text-xs text-muted-foreground">{t(field.helpKey)}</p>}
            {error && <p className="text-xs text-destructive">{t(error)}</p>}
          </div>
        );
      }}
    />
  );
}