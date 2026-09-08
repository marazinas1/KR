import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { listAllProperties, getMyRole } from "@/lib/properties.functions";
import {
  getPropertySettings,
  savePropertySettings,
} from "@/lib/property-settings.functions";
import {
  DEFAULT_PROPERTY_SETTINGS,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@/lib/property-settings";
import { SettingsSectionForm } from "@/components/admin/settings/SettingsSectionForm";
import {
  IntegrationsSection,
  type IntegrationCard,
} from "@/components/admin/settings/IntegrationsSection";
import { TariffsSection } from "@/components/admin/settings/TariffsSection";
import { ApiAccessSection } from "@/components/admin/settings/ApiAccessSection";
import { EmailTestSection } from "@/components/admin/settings/EmailTestSection";
import { PLATFORM_NAME } from "@/lib/brand";
import { useBrandedTitle } from "@/hooks/useBrandedTitle";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: PropertySettingsPage,
  head: () => ({
    meta: [
      { title: `Bendrieji nustatymai | ${PLATFORM_NAME}` },
      {
        name: "description",
        content:
          "Objekto bendrieji nustatymai: viešnagės taisyklės, mokesčiai, mokėjimai, sąskaitos, pranešimai ir integracijos.",
      },
      { property: "og:title", content: `Bendrieji nustatymai | ${PLATFORM_NAME}` },
      {
        property: "og:description",
        content: "Centrinė objekto konfigūracijos vieta viešbučių valdymo sistemoje.",
      },
    ],
  }),
});

type NavId = SettingsSectionId | "integrations" | "api" | "users" | "tariffs";

function PropertySettingsPage() {
  const { t } = useTranslation();
  useBrandedTitle(t("settings.title"));
  const fetchProperties = useServerFn(listAllProperties);
  const fetchRole = useServerFn(getMyRole);
  const fetchSettings = useServerFn(getPropertySettings);
  const saveSettings = useServerFn(savePropertySettings);
  const qc = useQueryClient();

  const [active, setActive] = useState<NavId>("general");

  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canEdit = Boolean(role?.isOwner);
  // Managers and tenants have no access to settings.
  const forbidden = Boolean(role) && !role?.isOwner;

  const { data: properties } = useQuery({
    queryKey: ["admin-properties-settings"],
    queryFn: () => fetchProperties(),
  });

  const { data, isLoading: loadingSettings } = useQuery({
    queryKey: ["property-settings"],
    queryFn: () => fetchSettings(),
  });

  const save = useMutation({
    mutationFn: (vars: { section: SettingsSectionId; values: Record<string, unknown> }) =>
      saveSettings({
        data: { section: vars.section, values: vars.values },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-settings"] });
      toast.success(t("settings.saved"));
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("settings.saveFailed")),
  });

  const integrations = useMemo<IntegrationCard[]>(() => {
    return [
      {
        key: "gcal",
        name: "Google Calendar",
        description: t("settings.integrations.items.gcal"),
        status: "coming_soon",
      },
      {
        key: "stripe",
        name: "Stripe",
        description: t("settings.integrations.items.stripe"),
        status: "coming_soon",
      },
      {
        key: "paysera",
        name: "Paysera",
        description: t("settings.integrations.items.paysera"),
        status: "coming_soon",
      },
      {
        key: "smtp",
        name: "SMTP",
        description: t("settings.integrations.items.smtp"),
        status: "coming_soon",
      },
      {
        key: "sms",
        name: t("settings.integrations.smsName"),
        description: t("settings.integrations.items.sms"),
        status: "coming_soon",
      },
      {
        key: "api",
        name: t("settings.integrations.apiName"),
        description: t("settings.integrations.items.api"),
        status: "connected",
        detail: t("settings.integrations.apiDetail"),
      },
      {
        key: "webhook",
        name: "Webhook URL",
        description: t("settings.integrations.items.webhook"),
        status: "coming_soon",
      },
      {
        key: "landing",
        name: t("settings.integrations.landingName"),
        description: t("settings.integrations.items.landing"),
        status: "coming_soon",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, t]);

  const navItems: { id: NavId; icon: string; title: string }[] = [
    ...SETTINGS_SECTIONS.map((s) => ({ id: s.id as NavId, icon: s.icon, title: t(s.titleKey) })),
    { id: "tariffs", icon: "💧", title: t("settings.nav.tariffs") },
    { id: "integrations", icon: "🔌", title: t("settings.nav.integrations") },
    { id: "api", icon: "🔑", title: t("settings.nav.api") },
  ];

  const section = SETTINGS_SECTIONS.find((s) => s.id === active);
  const settings = data?.settings ?? DEFAULT_PROPERTY_SETTINGS;

  if (forbidden) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings2 className="h-6 w-6 text-primary" />
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="sticky top-12 z-30 bg-background lg:static lg:w-60 lg:shrink-0">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {navItems.map((item) => {
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:w-full ${
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.title}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {loadingSettings ? (
              <div className="flex items-center gap-2 rounded-lg border p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </div>
            ) : active === "tariffs" ? (
              <TariffsSection canEdit={canEdit} />
            ) : active === "api" ? (
              <ApiAccessSection canEdit={canEdit} />
            ) : active === "integrations" ? (
              <div className="space-y-4">
                <IntegrationsSection items={integrations} />
                <EmailTestSection canEdit={canEdit} />
              </div>
            ) : section ? (
              <SettingsSectionForm
                key={section.id}
                section={section}
                settings={settings}
                canEdit={canEdit}
                saving={save.isPending}
                onSave={async (values) => {
                  await save.mutateAsync({ section: section.id, values });
                }}
              />
            ) : null}
          </div>
      </div>
    </div>
  );
}