import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { listIssues } from "@/lib/issues.functions";
import { listUnits } from "@/lib/units.functions";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, daysBetween, todayIso } from "@/lib/rental";

const OPEN_STATUSES = ["new", "acknowledged", "in_progress", "waiting"];
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

type IssuesSearch = { status?: "open" | "all" | (typeof ISSUE_STATUSES)[number]; priority?: string };

export const Route = createFileRoute("/_authenticated/admin/issues")({
  component: IssuesPage,
  validateSearch: (s: Record<string, unknown>): IssuesSearch => {
    const out: IssuesSearch = {};
    if (s["status"] === "all" || ISSUE_STATUSES.includes(s["status"] as never))
      out.status = s["status"] as IssuesSearch["status"];
    if (ISSUE_PRIORITIES.includes(s["priority"] as never)) out.priority = s["priority"] as string;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Gedimai — nuomos administravimas" },
      { name: "description", content: "Visų butų atviri gedimai pagal prioritetą ir amžių." },
    ],
  }),
});

const priorityClass: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-sky-100 text-sky-800",
  low: "bg-muted text-muted-foreground",
};

function IssuesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const status = search.status ?? "open";
  const fetchIssues = useServerFn(listIssues);
  const fetchUnits = useServerFn(listUnits);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["admin-issues"],
    queryFn: () => fetchIssues({ data: {} }),
  });
  const { data: units = [] } = useQuery({ queryKey: ["admin-units"], queryFn: () => fetchUnits() });
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const rows = useMemo(() => {
    const today = todayIso();
    return issues
      .filter((i) =>
        status === "all" ? true : status === "open" ? OPEN_STATUSES.includes(i.status) : i.status === status,
      )
      .filter((i) => (search.priority ? i.priority === search.priority : true))
      .map((i) => ({ ...i, age: daysBetween(i.created_at.slice(0, 10), today) }))
      .sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          a.created_at.localeCompare(b.created_at),
      );
  }, [issues, status, search.priority]);

  const setSearch = (patch: IssuesSearch) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...patch };
        if (next.status === "open") delete next.status;
        if (!next.priority) delete next.priority;
        return next;
      },
      replace: true,
    });

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("rental.issuesList.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("rental.issuesList.count", { count: rows.length })}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["open", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={status === f ? "default" : "outline"}
            onClick={() => setSearch({ status: f })}
          >
            {t(`rental.issuesList.filter.${f}`)}
          </Button>
        ))}
        <select
          value={ISSUE_STATUSES.includes(status as never) ? status : ""}
          onChange={(e) => setSearch({ status: (e.target.value || "open") as IssuesSearch["status"] })}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label={t("rental.issues.status")}
        >
          <option value="">{t("rental.issuesList.anyStatus")}</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`rental.issueStatus.${s}`)}
            </option>
          ))}
        </select>
        <select
          value={search.priority ?? ""}
          onChange={(e) => setSearch({ priority: e.target.value || undefined })}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label={t("rental.issues.priority")}
        >
          <option value="">{t("rental.issuesList.anyPriority")}</option>
          {ISSUE_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`rental.issuePriority.${p}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">{t("rental.issues.priority")}</th>
              <th className="p-2">{t("rental.issues.title")}</th>
              <th className="p-2">{t("rental.units.colUnit")}</th>
              <th className="p-2">{t("rental.issues.category")}</th>
              <th className="p-2">{t("rental.issues.status")}</th>
              <th className="p-2">{t("rental.issuesList.age")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  {t("rental.issues.empty")}
                </td>
              </tr>
            )}
            {rows.map((i) => (
              <tr key={i.id} className="border-t align-top">
                <td className="p-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs ${priorityClass[i.priority] ?? ""}`}>
                    {t(`rental.issuePriority.${i.priority}`)}
                  </span>
                </td>
                <td className="p-2">
                  <Link
                    to="/admin/units/$id"
                    params={{ id: i.unit_id }}
                    search={{ tab: "issues" }}
                    className="font-medium text-primary hover:underline"
                  >
                    {i.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{i.reporter_name}</div>
                </td>
                <td className="p-2">{unitName.get(i.unit_id) ?? "—"}</td>
                <td className="p-2">{t(`rental.issueCategory.${i.category}`)}</td>
                <td className="p-2">{t(`rental.issueStatus.${i.status}`)}</td>
                <td className="p-2 tabular-nums">{t("rental.issuesList.days", { count: i.age })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
