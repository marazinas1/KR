import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarClock, DoorOpen, FileWarning, Gauge, Inbox, Wallet } from "lucide-react";
import { getDashboard } from "@/lib/dashboard.functions";
import { KpiCard } from "@/components/admin/KpiCard";
import { CardRow, DashboardCard } from "@/components/admin/DashboardCard";

/**
 * The admin "morning screen": what needs attention today.
 * Every card is a link into the filtered list behind its number.
 */
export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Skydelis — nuomos administravimas" },
      {
        name: "description",
        content: "Besibaigiančios sutartys, tušti butai, trūkstami rodmenys, gedimai ir skolininkai.",
      },
    ],
  }),
});

function AdminDashboard() {
  const { t } = useTranslation();
  const fetchDashboard = useServerFn(getDashboard);
  const { data: d, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard(),
    refetchOnMount: "always",
  });

  if (isLoading || !d) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ? (error as Error).message : t("common.loading")}
        </p>
      </div>
    );
  }

  const eur = (n: number) => `${n.toFixed(2)} €`;
  const k = "rental.dashboard";
  const expiringTotal = d.expiring.d30 + d.expiring.d60 + d.expiring.d90;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(`${k}.subtitle`, { date: d.today })}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t(`${k}.kpi.occupancy`)}
          value={`${d.kpis.occupancyPct}%`}
          hint={t(`${k}.kpi.occupancyHint`, { occupied: d.kpis.occupiedUnits, total: d.kpis.activeUnits })}
        />
        <KpiCard label={t(`${k}.kpi.rentRoll`)} value={eur(d.kpis.rentRoll)} hint={t(`${k}.kpi.rentRollHint`)} />
        <KpiCard label={t(`${k}.kpi.vacant`)} value={d.kpis.vacantUnits} hint={t(`${k}.kpi.vacantHint`)} />
        <KpiCard label={t(`${k}.kpi.debt`)} value={eur(d.kpis.debtTotal)} hint={t(`${k}.kpi.debtHint`, { count: d.debtors.count })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          title={t(`${k}.expiring.title`)}
          count={expiringTotal}
          tone={d.expiring.d30 > 0 ? "warn" : "default"}
          icon={<CalendarClock className="h-4 w-4" />}
          to={{ to: "/admin/units", search: { view: "expiring", days: 90 } }}
          footer={t(`${k}.expiring.buckets`, { d30: d.expiring.d30, d60: d.expiring.d60, d90: d.expiring.d90 })}
        >
          {d.expiring.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.expiring.preview.map((e) => (
              <CardRow
                key={e.lease_id}
                left={`${e.unit_name} · ${e.tenant_name}`}
                right={t(`${k}.expiring.daysLeft`, { count: e.days_left })}
              />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.vacant.title`)}
          count={d.vacant.count}
          tone={d.vacant.count > 0 ? "warn" : "ok"}
          icon={<DoorOpen className="h-4 w-4" />}
          to={{ to: "/admin/units", search: { view: "vacant" } }}
          footer={t(`${k}.vacant.becoming`, { count: d.vacant.becomingVacant })}
        >
          {d.vacant.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.vacant.preview.map((v) => (
              <CardRow key={v.unit_id} left={v.unit_name} right={t(`${k}.vacant.days`, { count: v.vacant_days })} />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.readings.title`)}
          count={t(`${k}.readings.ofUnits`, { missing: d.readings.unitsMissing, total: d.readings.unitsExpected })}
          tone={d.readings.unitsMissing > 0 ? "warn" : "ok"}
          icon={<Gauge className="h-4 w-4" />}
          to={{ to: "/admin/units", search: { view: "missing_readings" } }}
          footer={t(`${k}.readings.footer`, { meters: d.readings.metersMissing, review: d.readings.pendingReview })}
        >
          {d.readings.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.readings.allIn`)}</p>
          ) : (
            d.readings.preview.map((r) => (
              <CardRow key={r.unit_id ?? r.label} left={r.label} right={t(`${k}.readings.meters`, { count: r.count })} />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.issues.title`)}
          count={d.issues.open}
          tone={(d.issues.byPriority["urgent"] ?? 0) > 0 ? "danger" : d.issues.open > 0 ? "warn" : "ok"}
          icon={<AlertTriangle className="h-4 w-4" />}
          to={{ to: "/admin/issues", search: {} }}
          footer={["urgent", "high", "normal", "low"]
            .filter((p) => d.issues.byPriority[p])
            .map((p) => `${t(`rental.issuePriority.${p}`)}: ${d.issues.byPriority[p]}`)
            .join(" · ")}
        >
          {d.issues.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.issues.preview.map((i) => (
              <CardRow key={i.id} left={`${i.unit_name} · ${i.title}`} right={t(`rental.issuePriority.${i.priority}`)} />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.debtors.title`)}
          count={d.debtors.count}
          tone={d.debtors.count > 0 ? "danger" : "ok"}
          icon={<Wallet className="h-4 w-4" />}
          to={{ to: "/admin/units", search: { view: "debtors" } }}
          footer={t(`${k}.debtors.total`, { amount: eur(d.debtors.total) })}
        >
          {d.debtors.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.debtors.preview.map((x) => (
              <CardRow key={x.lease_id} left={`${x.unit_name} · ${x.tenant_name}`} right={eur(x.balance)} />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.inquiries.title`)}
          count={d.inquiries.newCount}
          tone={d.inquiries.newCount > 0 ? "warn" : "default"}
          icon={<Inbox className="h-4 w-4" />}
          to={{ to: "/admin/inquiries", search: { status: "new" } }}
          footer={t(`${k}.inquiries.footer`)}
        >
          {d.inquiries.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.inquiries.preview.map((q) => (
              <CardRow key={q.id} left={`${q.name}${q.unit_name ? ` · ${q.unit_name}` : ""}`} right={q.created_at.slice(0, 10)} />
            ))
          )}
        </DashboardCard>

        <DashboardCard
          title={t(`${k}.documents.title`)}
          count={d.documents.count}
          tone={d.documents.count > 0 ? "warn" : "default"}
          icon={<FileWarning className="h-4 w-4" />}
          to={
            d.documents.preview[0]?.unit_id
              ? { to: "/admin/units/$id", params: { id: d.documents.preview[0].unit_id }, search: { tab: "documents" } }
              : { to: "/admin/units", search: {} }
          }
          footer={t(`${k}.documents.footer`)}
        >
          {d.documents.preview.length === 0 ? (
            <p className="text-muted-foreground">{t(`${k}.none`)}</p>
          ) : (
            d.documents.preview.map((doc) => <CardRow key={doc.id} left={doc.title} right={doc.expires_at} />)
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
