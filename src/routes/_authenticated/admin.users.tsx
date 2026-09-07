import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { UserCog } from "lucide-react";
import { getMyRole } from "@/lib/properties.functions";
import { UsersSection } from "@/components/admin/settings/UsersSection";
import { PLATFORM_NAME } from "@/lib/brand";
import { useBrandedTitle } from "@/hooks/useBrandedTitle";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      { title: `Vartotojai | ${PLATFORM_NAME}` },
      {
        name: "description",
        content: "Komandos narių valdymas: kvietimai, rolės ir prieigos teisės.",
      },
      { property: "og:title", content: `Vartotojai | ${PLATFORM_NAME}` },
      {
        property: "og:description",
        content: "Kvieskite komandos narius ir valdykite jų roles bei prieigą.",
      },
    ],
  }),
});

function AdminUsersPage() {
  const { t } = useTranslation();
  useBrandedTitle(t("settings.nav.users"));
  const fetchRole = useServerFn(getMyRole);
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }
  if (role && !role.isOwner) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <UserCog className="h-6 w-6 text-primary" />
          {t("settings.nav.users")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kvieskite komandos narius ir valdykite jų roles.
        </p>
      </header>
      <UsersSection canEdit={Boolean(role?.isOwner)} />
    </div>
  );
}
