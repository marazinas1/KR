import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Eye, Inbox, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMyRole } from "@/lib/properties.functions";
import { useAnalytics, percentChange, type AnalyticsRange } from "@/hooks/useAnalytics";
import { PLATFORM_NAME } from "@/lib/brand";
import { useBrandedTitle } from "@/hooks/useBrandedTitle";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: `Analitika | ${PLATFORM_NAME}` },
      {
        name: "description",
        content: "Svetainės lankomumo statistika: peržiūros, lankytojai, šaltiniai ir įrenginiai.",
      },
      { property: "og:title", content: `Analitika | ${PLATFORM_NAME}` },
      {
        property: "og:description",
        content: "Pirminių duomenų lankomumo statistika be trečiųjų šalių sekimo.",
      },
    ],
  }),
});

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 7, label: "7 d." },
  { value: 30, label: "30 d." },
  { value: 90, label: "90 d." },
];

const SOURCE_LABEL: Record<string, string> = {
  direct: "Tiesiogiai",
  google: "Google",
  search: "Kitos paieškos",
  facebook: "Facebook",
  instagram: "Instagram",
  booking: "Booking.com",
  airbnb: "Airbnb",
  other: "Kitos svetainės",
};

const DEVICE_LABEL: Record<string, string> = {
  desktop: "Kompiuteris",
  mobile: "Telefonas",
  tablet: "Planšetė",
  unknown: "Nežinoma",
};

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("lt-LT", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: string | number;
  change?: number | null;
  icon: typeof Eye;
  suffix?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-3xl font-light tabular-nums text-foreground">
        {value}
        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
      </p>
      {change !== undefined && change !== null && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs ${
            positive ? "text-foreground" : "text-destructive"
          }`}
        >
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {positive ? "+" : ""}
          {change}% lyginant su ankstesniu laikotarpiu
        </p>
      )}
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: { label: string; views: number }[];
  total: number;
  empty: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-3 text-muted-foreground">{row.label}</span>
                <span className="shrink-0 tabular-nums text-foreground">{row.views}</span>
              </div>
              <Progress value={total ? (row.views / total) * 100 : 0} className="mt-1.5 h-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalyticsPage() {
  useBrandedTitle("Analitika");
  const fetchRole = useServerFn(getMyRole);
  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const [range, setRange] = useState<AnalyticsRange>(30);
  const { data, isLoading, error } = useAnalytics(range);

  const chartData = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: { day: string; label: string; views: number; visitors: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      out.push({
        day: key,
        label: shortDay(key),
        views: Number(row?.views ?? 0),
        visitors: Number(row?.visitors ?? 0),
      });
    }
    return out;
  }, [data, range]);

  if (role && !role.isOwner) return <Navigate to="/admin" replace />;

  const totalViews = Number(data?.totals?.views ?? 0);
  const totalVisitors = Number(data?.totals?.visitors ?? 0);
  const leads = Number(data?.leads ?? 0);
  const conversion = totalVisitors ? ((leads / totalVisitors) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analitika
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pirminiai lankomumo duomenys. Jokių slapukų ir trečiųjų šalių sekimo.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              type="button"
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
          Nepavyko įkelti analitikos. {error instanceof Error ? error.message : ""}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Kraunama…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Puslapių peržiūros"
              value={totalViews}
              change={percentChange(totalViews, Number(data?.previous?.views ?? 0))}
              icon={Eye}
            />
            <StatCard
              label="Unikalūs lankytojai"
              value={totalVisitors}
              change={percentChange(totalVisitors, Number(data?.previous?.visitors ?? 0))}
              icon={Users}
            />
            <StatCard label="Rezervacijos" value={leads} icon={Inbox} />
            <StatCard label="Konversija" value={conversion} suffix="%" icon={TrendingUp} />
          </div>

          <div className="mt-6 rounded-lg border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-foreground">Srautas</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="visitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Peržiūros"
                    stroke="hsl(var(--primary))"
                    fill="url(#views)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Lankytojai"
                    stroke="hsl(var(--muted-foreground))"
                    fill="url(#visitors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <BreakdownList
              title="Populiariausi puslapiai"
              total={totalViews}
              empty="Peržiūrų dar nėra."
              rows={(data?.top_pages ?? []).map((p) => ({ label: p.path, views: Number(p.views) }))}
            />
            <BreakdownList
              title="Srauto šaltiniai"
              total={totalViews}
              empty="Šaltinių dar nėra."
              rows={(data?.sources ?? []).map((s) => ({
                label: SOURCE_LABEL[s.source] ?? s.source,
                views: Number(s.views),
              }))}
            />
            <BreakdownList
              title="Įrenginiai"
              total={totalViews}
              empty="Įrenginių dar nėra."
              rows={(data?.devices ?? []).map((d) => ({
                label: DEVICE_LABEL[d.device] ?? d.device,
                views: Number(d.views),
              }))}
            />
          </div>

          {totalViews === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Duomenys pradedami kaupti, kai svetainė aplankoma. Apsilankymai atsiras čia per kelias
              minutes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
