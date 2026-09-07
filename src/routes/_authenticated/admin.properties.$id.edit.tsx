import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertyForEdit, updateProperty } from "@/lib/properties.functions";
import { syncPropertyIcal } from "@/lib/ical.functions";
import { PropertyForm, propertyToForm, type PropertyFormValues } from "@/components/admin/PropertyForm";
import { TranslationPanel } from "@/components/admin/TranslationPanel";
import {
  PROPERTY_TRANSLATABLE_FIELDS,
  extraServiceField,
  type TranslatableFieldDef,
} from "@/lib/translations";

export const Route = createFileRoute("/_authenticated/admin/properties/$id/edit")({
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/_authenticated/admin/properties/$id/edit" });
  const fetchOne = useServerFn(getPropertyForEdit);
  const update = useServerFn(updateProperty);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const syncIcal = useServerFn(syncPropertyIcal);

  const { data: prop, isLoading, refetch } = useQuery({
    queryKey: ["property-edit", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (v: PropertyFormValues) => update({ data: { id, patch: v } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["property-edit", id] }),
        qc.invalidateQueries({ queryKey: ["admin-all-properties"] }),
        qc.invalidateQueries({ queryKey: ["admin-props"] }),
        qc.invalidateQueries({ queryKey: ["admin-props-all"] }),
        qc.invalidateQueries({ queryKey: ["admin-properties-settings"] }),
      ]);
      navigate({ to: "/admin/properties" });
    },
  });

  const sync = useMutation({
    mutationFn: () => syncIcal({ data: { propertyId: id } }),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (!prop) return <p>{t("properties.notFound")}</p>;

  const extraFields: TranslatableFieldDef[] = (prop.extraServices ?? [])
    .filter((s) => s.name?.trim())
    .map((s) => ({
      field: extraServiceField(s.name),
      label: t("properties.extraServiceLabel", { name: s.name }),
    }));

  const translatableFields = [...PROPERTY_TRANSLATABLE_FIELDS, ...extraFields];

  const originals: Record<string, string> = {
    name: prop.name ?? "",
    description: prop.description ?? "",
    location_note: prop.locationNote ?? "",
    rooms_notes: prop.rooms?.notes ?? "",
    ...Object.fromEntries(
      (prop.extraServices ?? [])
        .filter((s) => s.name?.trim())
        .map((s) => [extraServiceField(s.name), s.name]),
    ),
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{t("properties.editTitle", { name: prop.name })}</h1>
      <PropertyForm
        initial={propertyToForm(prop)}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
        icalMeta={{
          lastSyncAt: prop.icalLastSyncAt,
          lastStatus: prop.icalLastStatus,
          onSync: prop.icalImportUrl ? () => sync.mutate() : undefined,
          syncing: sync.isPending,
        }}
      />
      <p className="mt-6 text-sm text-muted-foreground">
        {t("properties.translationsNote")}
      </p>
      <div className="mt-3">
        <TranslationPanel
          entityType="property"
          entityId={id}
          fields={translatableFields}
          originals={originals}
        />
      </div>
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}