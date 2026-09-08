import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Gauge, Mail, Phone, Wrench } from "lucide-react";
import { getMyBalance, getMyLease } from "@/lib/tenant-portal.functions";
import { getPublicOrg } from "@/lib/public-vacancies.functions";
import { formatMoney } from "@/lib/rental";

export const Route = createFileRoute("/_authenticated/nuomininkas/")({
  component: TenantHome,
});

function TenantHome() {
  const { t, i18n } = useTranslation();
  const fetchLease = useServerFn(getMyLease);
  const fetchBalance = useServerFn(getMyBalance);
  const fetchOrg = useServerFn(getPublicOrg);
  const { data, isLoading } = useQuery({ queryKey: ["my-lease"], queryFn: () => fetchLease() });
  const { data: bal } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance() });
  const { data: org } = useQuery({ queryKey: ["public-org"], queryFn: () => fetchOrg() });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(i18n.language);

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!data?.lease || !data.unit) {
    return <div className="rounded-xl border bg-background p-5 text-sm">{t("tenant.noLease")}</div>;
  }
  const { lease, unit } = data;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-background p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tenant.myUnit")}</p>
        <h1 className="mt-1 text-xl font-semibold">
          {unit.name || `${unit.building_name ?? ""} ${unit.unit_number}`.trim()}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[unit.address, unit.city].filter(Boolean).join(", ")}
        </p>
      </section>

      <section className="rounded-xl border bg-background p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tenant.myLease")}</p>
        <dl className="mt-2 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t("tenant.rent")}</dt>
          <dd className="text-right font-semibold">{formatMoney(lease.monthly_rent)}</dd>
          <dt className="text-muted-foreground">{t("tenant.paymentDay")}</dt>
          <dd className="text-right">{t("tenant.paymentDayValue", { day: lease.payment_day })}</dd>
          <dt className="text-muted-foreground">{t("tenant.from")}</dt>
          <dd className="text-right">{fmtDate(lease.start_date)}</dd>
          <dt className="text-muted-foreground">{t("tenant.until")}</dt>
          <dd className="text-right">{lease.end_date ? fmtDate(lease.end_date) : t("tenant.openEnded")}</dd>
          <dt className="text-muted-foreground">{t("tenant.deposit")}</dt>
          <dd className="text-right">{formatMoney(lease.deposit)}</dd>
        </dl>
        {!lease.renewal && lease.end_date && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("tenant.notRenewing", { date: fmtDate(lease.end_date) })}
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-background p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tenant.balance")}</p>
        {bal && (
          <>
            <p className="mt-1 text-2xl font-semibold">
              {bal.balance > 0
                ? `${t("tenant.youOwe")}: ${formatMoney(bal.balance)}`
                : bal.balance < 0
                  ? `${t("tenant.inCredit")}: ${formatMoney(-bal.balance)}`
                  : t("tenant.settled")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("tenant.charged")} {formatMoney(bal.charged)} · {t("tenant.paid")} {formatMoney(bal.paid)}
              {bal.upcoming > 0 && <> · {t("tenant.upcoming")} {formatMoney(bal.upcoming)}</>}
            </p>
            {bal.charges.length > 0 && (
              <ul className="mt-3 divide-y text-sm">
                {bal.charges.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex justify-between py-2">
                    <span>
                      <span className="text-muted-foreground">{c.period.slice(0, 7)}</span> {c.description || c.kind}
                    </span>
                    <span>{formatMoney(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/nuomininkas/rodmenys" className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl bg-primary text-primary-foreground">
          <Gauge className="h-6 w-6" />
          <span className="text-sm font-medium">{t("tenant.submitReadings")}</span>
        </Link>
        <Link to="/nuomininkas/gedimai" className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border bg-background">
          <Wrench className="h-6 w-6" />
          <span className="text-sm font-medium">{t("tenant.reportIssue")}</span>
        </Link>
      </div>

      {(org?.phone || org?.email) && (
        <section className="rounded-xl border bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tenant.contactManager")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {org.phone && (
              <a href={`tel:${org.phone}`} className="inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm">
                <Phone className="h-4 w-4" /> {org.phone}
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm">
                <Mail className="h-4 w-4" /> {org.email}
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
