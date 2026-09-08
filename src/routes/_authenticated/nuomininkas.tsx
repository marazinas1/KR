/**
 * Tenant portal layout (/nuomininkas). Phone-first: one column, bottom tab bar,
 * large tap targets. Gated to the `tenant` role; RLS scopes all data to the
 * signed-in tenant's own lease.
 */
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { FileText, Gauge, Home, LogOut, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/properties.functions";
import { getPublicOrg } from "@/lib/public-vacancies.functions";
import { PLATFORM_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/nuomininkas")({
  component: TenantLayout,
  head: () => ({
    meta: [
      { title: "Nuomininko savitarna" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function TenantLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const fetchOrg = useServerFn(getPublicOrg);
  const { data: role, isLoading } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const { data: org } = useQuery({ queryKey: ["public-org"], queryFn: () => fetchOrg() });

  useEffect(() => {
    if (!isLoading && role && !role.isTenant) {
      navigate({ to: role.isManager ? "/admin" : "/auth", replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading || !role?.isTenant) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  const tabs = [
    { to: "/nuomininkas", label: t("tenant.home"), icon: Home, exact: true },
    { to: "/nuomininkas/rodmenys", label: t("tenant.readings"), icon: Gauge },
    { to: "/nuomininkas/gedimai", label: t("tenant.issues"), icon: Wrench },
    { to: "/nuomininkas/dokumentai", label: t("tenant.documents"), icon: FileText },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tenant.title")}</p>
          <p className="font-semibold">{org?.displayName || PLATFORM_NAME}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground"
          aria-label={t("tenant.signOut")}
        >
          <LogOut className="h-4 w-4" />
          {t("tenant.signOut")}
        </button>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ to, label, icon: Icon, ...rest }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: "exact" in rest && rest.exact }}
                className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
                activeProps={{ className: "text-primary font-medium" }}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
