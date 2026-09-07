import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { KeyRound, DoorOpen, CreditCard, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/admin/KpiCard";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { BookingsTimeline } from "@/components/admin/BookingsTimeline";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { resolvePeriod, type PeriodKey } from "@/lib/dashboard-period";
import { propertyTypeLabelKey } from "@/lib/properties";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<{ period: PeriodKey; from: string | null; to: string | null }>(() => {
    const r = resolvePeriod("mtd");
    return { period: "mtd", from: r.from, to: r.to };
  });

  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", period.from, period.to],
    queryFn: () => fetchStats({ data: { from: period.from, to: period.to } }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <PeriodFilter
          value={period}
          onChange={(v) => setPeriod({ period: v.period, from: v.from ?? null, to: v.to ?? null })}
        />
      </div>

      <Tabs defaultValue="ops" className="mt-6">
        <TabsList>
          <TabsTrigger value="ops">{t("dashboard.tabs.ops")}</TabsTrigger>
          <TabsTrigger value="fleet">{t("dashboard.tabs.fleet")}</TabsTrigger>
          <TabsTrigger value="biz">{t("dashboard.tabs.biz")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ops" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label={t("dashboard.ops.revenue")}
              value={`${(data?.operations.revenue ?? 0).toFixed(0)} €`}
              hint={t("dashboard.ops.revenueHint")}
            />
            <KpiCard
              label={t("dashboard.ops.utilization")}
              value={`${Math.round((data?.operations.utilization ?? 0) * 100)}%`}
              hint={t("dashboard.ops.utilizationHint")}
            />
            <KpiCard
              label={t("dashboard.ops.freeToday")}
              value={`${data?.operations.freeToday ?? 0} / ${data?.operations.totalActive ?? 0}`}
            />
            <KpiCard
              label={t("dashboard.ops.confirmed30d")}
              value={data?.operations.confirmed30d ?? 0}
              hint={t("dashboard.ops.confirmed30dHint")}
            />
            <KpiCard
              label={t("dashboard.ops.awaitingPayment")}
              value={`${(data?.operations.awaitingPayment.total ?? 0).toFixed(0)} €`}
              hint={t("dashboard.ops.awaitingPaymentHint", {
                count: data?.operations.awaitingPayment.count ?? 0,
              })}
            />
            <KpiCard
              label={t("dashboard.ops.abv")}
              value={`${(data?.operations.avgBookingValue ?? 0).toFixed(0)} €`}
              hint={t("dashboard.ops.abvHint")}
            />
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label={t("dashboard.fleet.total")}
              value={data?.fleet.total ?? 0}
              hint={t("dashboard.fleet.activeHint", { count: data?.fleet.active ?? 0 })}
            />
            <KpiCard label={t("dashboard.fleet.avgPrice")} value={`${(data?.fleet.avgPrice ?? 0).toFixed(0)} €`} />
            <KpiCard label={t("dashboard.fleet.missingPhotos")} value={data?.fleet.missingPhotos ?? 0} />
            <KpiCard label={t("dashboard.fleet.missingDescription")} value={data?.fleet.missingDescription ?? 0} />
          </div>
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">{t("dashboard.fleet.byType")}</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {Object.entries(data?.fleet.byType ?? {}).map(([k, v]) => (
                <span key={k} className="rounded-full border px-3 py-1">
                  {t(propertyTypeLabelKey(k))}: <strong>{v as number}</strong>
                </span>
              ))}
              {Object.keys(data?.fleet.byType ?? {}).length === 0 ? (
                <span className="text-muted-foreground">{t("dashboard.fleet.empty")}</span>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="biz" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t("dashboard.biz.netProfit")} value={`${(data?.business.netProfit ?? 0).toFixed(0)} €`} />
            <KpiCard label={t("dashboard.biz.revenue")} value={`${(data?.business.revenue ?? 0).toFixed(0)} €`} />
            <KpiCard label={t("dashboard.biz.expenses")} value={`${(data?.business.expensesTotal ?? 0).toFixed(0)} €`} />
            <KpiCard
              label={t("dashboard.biz.avgStay")}
              value={t("dashboard.biz.days", { value: (data?.business.avgStayNights ?? 0).toFixed(1) })}
            />
          </div>
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">{t("dashboard.biz.expensesByCategory")}</h3>
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(data?.business.expensesByCategory ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b pb-1 last:border-none">
                  <span>{k}</span>
                  <span className="font-medium">{(v as number).toFixed(0)} €</span>
                </div>
              ))}
              {Object.keys(data?.business.expensesByCategory ?? {}).length === 0 ? (
                <span className="text-muted-foreground">{t("dashboard.biz.noExpenses")}</span>
              ) : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BookingsTimeline
          title={t("dashboard.checkinsToday")}
          icon={<KeyRound className="h-4 w-4 text-primary" />}
          bookings={data?.checkinsToday ?? []}
        />
        <BookingsTimeline
          title={t("dashboard.checkoutsToday")}
          icon={<DoorOpen className="h-4 w-4 text-primary" />}
          bookings={data?.checkoutsToday ?? []}
        />
        <BookingsTimeline
          title={t("dashboard.ops.awaitingPayment")}
          icon={<CreditCard className="h-4 w-4 text-primary" />}
          bookings={data?.awaitingPaymentList ?? []}
          showAmount
        />
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("dashboard.recent24h")}
        </h3>
        <div className="mt-3 space-y-2">
          {(data?.recent24h ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isLoading ? t("common.loading") : t("dashboard.noRecent")}
            </p>
          ) : (
            (data?.recent24h ?? []).map((b: any) => (
              <Link
                key={b.id}
                to="/admin/bookings/$id"
                params={{ id: b.id }}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {b.properties?.name ?? "—"} · {b.customer_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.date_from} → {b.date_to}
                  </div>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">{b.status}</span>
                  <span>{Number(b.total_amount ?? 0).toFixed(0)} €</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}