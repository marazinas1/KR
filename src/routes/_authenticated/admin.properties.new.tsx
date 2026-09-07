import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProperty } from "@/lib/properties.functions";
import { PropertyForm, propertyToForm, type PropertyFormValues } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_authenticated/admin/properties/new")({
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const { t } = useTranslation();
  const create = useServerFn(createProperty);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v: PropertyFormValues) => create({ data: v }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-all-properties"] }),
        qc.invalidateQueries({ queryKey: ["admin-props"] }),
        qc.invalidateQueries({ queryKey: ["admin-props-all"] }),
        qc.invalidateQueries({ queryKey: ["admin-properties-settings"] }),
      ]);
      navigate({ to: "/admin/properties" });
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{t("properties.newTitle")}</h1>
      <PropertyForm
        initial={propertyToForm(null)}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
      />
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}