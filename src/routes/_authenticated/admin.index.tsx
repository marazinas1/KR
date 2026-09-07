import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * PLACEHOLDER — the short-term rental dashboard was removed in step 1.
 * The long-term rental dashboard (expiring leases, vacancies, missing meter
 * readings, open issues, debtors) is built in a later step.
 */
export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
    </div>
  );
}
