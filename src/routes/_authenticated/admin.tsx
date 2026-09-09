import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BarChart3, Building2, FileEdit, FileText, Globe, Inbox, LayoutDashboard, LogOut, Menu, Receipt,
  Coins, Settings2, UserCog, Users, Wallet, Wrench } from "lucide-react";
import { getMyRole } from "@/lib/properties.functions";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { getDashboard } from "@/lib/dashboard.functions";

import { useDefaultLanguage } from "@/hooks/useDefaultLanguage";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useTranslation();
  useDefaultLanguage();
  const [navOpen, setNavOpen] = useState(false);
  const fetchRole = useServerFn(getMyRole);
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    refetchOnMount: "always",
  });
  const fetchSettings = useServerFn(getPropertySettings);
  const { data: settingsData } = useQuery({
    queryKey: ["property-settings"],
    queryFn: () => fetchSettings(),
  });
  // Same cache entry the dashboard page uses, so the badges cost no extra request there.
  const fetchDashboard = useServerFn(getDashboard);
  const { data: dashboard } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: role?.isManager === true,
    staleTime: 60_000,
  });
  const newInquiries = dashboard?.inquiries.newCount ?? 0;
  const openIssues = dashboard?.issues.open ?? 0;

  const brandName = settingsData?.settings.displayName?.trim() || "";
  const { location } = useRouterState();
  const navigate = useNavigate();
  // Tenant-only logins belong in the tenant portal, not on a "no access" page.
  useEffect(() => {
    if (!isLoading && role && !role.isManager && role.isTenant) {
      navigate({ to: "/nuomininkas", replace: true });
    }
  }, [isLoading, role, navigate]);


  if (isLoading) {
    return <div className="p-8 text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!role?.isManager) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold">{t("admin.noAdminTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.noAdminText")}</p>
      </div>
    );
  }

  const groups = [
    {
      label: t("nav.group.overview"),
      items: [
        { to: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/admin/inquiries", label: t("rental.nav.inquiries"), icon: Inbox, badge: newInquiries },
        // Site-visit analytics belongs with the overview group.
        ...(role.isOwner
          ? [{ to: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 }]
          : []),
      ],
    },
    {
      label: t("nav.group.portfolio"),
      items: [
        { to: "/admin/units", label: t("rental.nav.units"), icon: Building2 },
        { to: "/admin/tenants", label: t("rental.nav.tenants"), icon: Users },
        { to: "/admin/contracts", label: t("nav.contracts"), icon: FileText },
        // Faults concern the units themselves.
        { to: "/admin/issues", label: t("rental.nav.issues"), icon: Wrench, badge: openIssues },
      ],
    },
    {
      label: t("nav.group.finance"),
      items: [
        { to: "/admin/charges", label: t("rental.nav.charges"), icon: Coins },
        { to: "/admin/invoices", label: t("nav.invoices"), icon: Receipt },
        { to: "/admin/expenses", label: t("nav.expenses"), icon: Wallet },
      ],
    },
    {
      label: t("nav.group.system"),
      items: [
        // User management and settings are owner-level only.
        ...(role.isOwner
          ? [
              { to: "/admin/users", label: t("nav.users"), icon: UserCog },
              { to: "/admin/settings", label: t("nav.settings"), icon: Settings2 },
            ]
          : []),
        { to: "/admin/content", label: t("nav.content"), icon: FileEdit },
      ],
    },
  ].filter((g) => g.items.length > 0);


  const roleLabel = t(`settings.users.role_${role.role}`, {
    defaultValue: role.role,
  });


  const navContent = (
    <>
      <div className="px-4 py-4 text-sidebar-foreground">
        <BrandMark
          displayName={brandName}
          tagline={settingsData?.settings.tagline}
          logoUrl={settingsData?.settings.brandLogoUrl || undefined}
        />
      </div>
      <nav className="flex-1 space-y-5 px-2">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/45">
              {group.label}
            </p>
            {group.items.map((l) => {
              const Icon = l.icon;
              const active =
                l.to === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname.startsWith(l.to);
              const badge = "badge" in l ? (l.badge as number | undefined) : undefined;

              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 truncate">{l.label}</span>
                  {badge ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                        active
                          ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-accent-foreground"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-sidebar-border px-2 py-3 text-sidebar-foreground">
          {/* Signed-in user: name/email + role */}
          <div className="mb-2 rounded-md px-3 py-2">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {role.email || t("nav.dashboard")}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              {roleLabel}
            </p>
          </div>
          <LanguageSwitcher />

          <a
            href="/"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Globe className="h-4 w-4" />
            {t("nav.website")}
          </a>
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={async () => {
              setNavOpen(false);
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {navContent}
      </aside>


      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-card px-3 py-2 md:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t("nav.dashboard")}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
            <SheetTitle className="sr-only">{brandName}</SheetTitle>
            {navContent}
          </SheetContent>
        </Sheet>
        <span className="min-w-0 flex-1 truncate font-semibold">{brandName}</span>
        <div className="shrink-0">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}