import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  settingsSchemas,
  type PropertySettings,
  type SectionDef,
} from "@/lib/property-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsField } from "./SettingsField";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";

function pick(section: SectionDef, settings: PropertySettings) {
  const out: Record<string, unknown> = {};
  for (const f of section.fields) out[f.name] = settings[f.name];
  return out;
}

export function SettingsSectionForm({
  section,
  settings,
  canEdit,
  saving,
  onSave,
}: {
  section: SectionDef;
  settings: PropertySettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(settingsSchemas[section.id] as never),
    defaultValues: pick(section, settings),
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset(pick(section, settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, settings]);

  const errors = form.formState.errors as Record<string, { message?: string }>;
  const watched = form.watch() as Record<string, unknown>;

  return (
    <Card>
      <form
        onSubmit={form.handleSubmit(
          async (values) => {
            await onSave(values as Record<string, unknown>);
          },
          () => toast.error(t("settings.form.invalid")),
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span aria-hidden>{section.icon}</span>
            {t(section.titleKey)}
          </CardTitle>
          <CardDescription>{t(section.descriptionKey)}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          {section.fields.map((f) => (
            <SettingsField
              key={f.name as string}
              field={f}
              control={form.control}
              disabled={!canEdit || saving}
              error={errors[f.name as string]?.message}
            />
          ))}
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? t("settings.form.sectionOnly")
              : t("settings.form.readOnly")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {section.id === "invoicing" && (
              <InvoicePreviewDialog
                values={watched as Partial<PropertySettings>}
                fallbackCompanyName={settings.displayName ?? ""}
                fallbackAddress={settings.address ?? ""}
                currency={settings.currency ?? "EUR"}
                vatRate={Number(settings.vatRate) || 0}
              />
            )}
            <Button type="submit" disabled={!canEdit || saving} className="sm:w-auto">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}