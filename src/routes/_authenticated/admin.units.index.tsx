import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listBuildings, listUnits, setUnitListed } from "@/lib/units.functions";
import { UNIT_STATUSES, daysBetween, todayIso } from "@/lib/rental";
import { UnitFormDialog, emptyUnit } from "@/components/admin/units/UnitFormDialog";

/** Dashboard-card views. Each one is the exact list behind a card count. */
export const UNIT_VIEWS = ["expiring", "vacant", "becoming_vacant", "missing_readings", "debtors"] as const;
export type UnitView = (typeof UNIT_VIEWS)[number];

export type UnitsSearch = {
  q?: string;
  building?: string;
  status?: string;
  listed?: boolean;
  view?: UnitView;
  /** Horizon in days for `view=expiring` (30/60/90). */
  days?: number;
};

export const Route = createFileRoute("/_authenticated/admin/units/")({
  component: UnitsPage,
  validateSearch: (s: Record<string, unknown>): UnitsSearch => {
    const out: UnitsSearch = {};
    if (typeof s["q"] === "string" && s["q"]) out.q = s["q"];
    if (typeof s["building"] === "string" && s["building"]) out.building = s["building"];
    if (typeof s["status"] === "string" && UNIT_STATUSES.includes(s["status"] as never))
      out.status = s["status"];
    if (s["listed"] === true || s["listed"] === "true") out.listed = true;
    if (UNIT_VIEWS.includes(s["view"] as never)) out.view = s["view"] as UnitView;
    const d = Number(s["days"]);
    if ([30, 60, 90].includes(d)) out.days = d;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Butai — nuomos administravimas" },
      {
        name: "description",
        content: "Ilgalaikės nuomos butų sąrašas: būsena, nuoma, tuščios dienos ir filtrai.",
      },
    ],
  }),
});

const statusClass: Record<string, string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-sky-100 text-sky-800",
  reserved: "bg-amber-100 text-amber-800",
  renovation: "bg-orange-100 text-orange-800",
  inactive: "bg-muted text-muted-foreground",
};

function UnitsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const fetchUnits = useServerFn(listUnits);
  const fetchBuildings = useServerFn(listBuildings);
  const toggleListed = useServerFn(setUnitListed);

  const { data: units = [], refetch, isLoading } = useQuery({
    queryKey: ["admin-units"],
    queryFn: () => fetchUnits(),
  });
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => fetchBuildings(),
  });

  const q = search.q ?? "";
  const building = search.building ?? "";
  const status = search.status ?? "";
  const listedOnly = search.listed === true;
  const view = search.view;
  const days = search.days ?? 90;
  const setSearch = (patch: Partial<UnitsSearch>) =>
    navigate({
      search: (prev) => {
        const next: UnitsSearch = { ...prev, ...patch };
        for (const k of Object.keys(next) as (keyof UnitsSearch)[])
          if (next[k] === undefined || next[k] === "" || next[k] === false) delete next[k];
        return next;
      },
      replace: true,
    });
  const [dialogOpen, setDialogOpen] = useState(false);

  const listedMutation = useMutation({
    mutationFn: (v: { id: string; is_listed: boolean }) => toggleListed({ data: v }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const today = todayIso();
    let list = units.filter((u) => {
      if (building && u.building_id !== building) return false;
      if (status && u.status !== status) return false;
      if (listedOnly && !u.is_listed) return false;
      if (!needle) return true;
      return [u.name, u.unit_number, u.address, u.city, u.building_name, u.tenant_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
    // Same predicates as the dashboard cards (both read listUnits/getDashboard shared helpers).
    switch (view) {
      case "expiring":
        list = list
          .filter(
            (u) =>
              u.lease_end_date !== null &&
              u.lease_end_date >= today &&
              daysBetween(today, u.lease_end_date) <= days,
          )
          .sort((a, b) => String(a.lease_end_date).localeCompare(String(b.lease_end_date)));
        break;
      case "vacant":
        list = list
          .filter((u) => u.status === "vacant" && u.is_active)
          .sort((a, b) => (b.vacant_days ?? 0) - (a.vacant_days ?? 0));
        break;
      case "becoming_vacant":
        list = list
          .filter((u) => u.status === "occupied" && u.available_from !== null)
          .sort((a, b) => String(a.available_from).localeCompare(String(b.available_from)));
        break;
      case "missing_readings":
        list = list.filter((u) => u.missing_readings_count > 0);
        break;
      case "debtors":
        list = list.filter((u) => u.balance > 0).sort((a, b) => b.balance - a.balance);
        break;
    }
    return list;
  }, [units, q, building, status, listedOnly, view, days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("rental.units.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("rental.units.count", { count: rows.length })}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("rental.units.new")}
        </Button>
      </div>

      {view ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">
            {t(`rental.units.view.${view}`, view === "expiring" ? { days } : undefined)}
          </span>
          {view === "expiring" ? (
            <span className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={days === d ? "default" : "outline"}
                  onClick={() => setSearch({ days: d })}
                >
                  {d}
                </Button>
              ))}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSearch({ view: undefined, days: undefined })}
          >
            <X className="mr-1 h-4 w-4" />
            {t("rental.units.clearView")}
          </Button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t("rental.units.searchPlaceholder")}
            value={q}
            onChange={(e) => setSearch({ q: e.target.value })}
          />
        </div>
        <select
          value={building}
          onChange={(e) => setSearch({ building: e.target.value })}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label={t("rental.units.fBuilding")}
        >
          <option value="">{t("rental.units.allBuildings")}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setSearch({ status: e.target.value })}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label={t("rental.units.fStatus")}
        >
          <option value="">{t("rental.units.allStatuses")}</option>
          {UNIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`rental.status.${s}`)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={listedOnly} onCheckedChange={(v) => setSearch({ listed: v })} />
          {t("rental.units.onlyListed")}
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2">{t("rental.units.colUnit")}</th>
              <th className="p-2">{t("rental.units.colBuilding")}</th>
              <th className="p-2">{t("rental.units.colRooms")}</th>
              <th className="p-2">{t("rental.units.colRent")}</th>
              <th className="p-2">{t("rental.units.colStatus")}</th>
              <th className="p-2">{t("rental.units.colTenant")}</th>
              <th className="p-2">{t("rental.units.colListed")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  {t("rental.units.empty")}
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="p-2">
                  <Link
                    to="/admin/units/$id"
                    params={{ id: u.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {u.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {[u.unit_number, u.floor !== null ? t("rental.units.floorShort", { floor: u.floor }) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="p-2">
                  {u.building_name ?? "—"}
                  <div className="text-xs text-muted-foreground">{u.city}</div>
                </td>
                <td className="p-2">
                  {u.room_count}
                  {u.area_m2 ? ` · ${u.area_m2} m²` : ""}
                </td>
                <td className="p-2">{u.monthly_rent.toFixed(2)} €</td>
                <td className="p-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass[u.status] ?? ""}`}
                  >
                    {t(`rental.status.${u.status}`)}
                  </span>
                  {u.vacant_days !== null && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("rental.units.vacantDays", { count: u.vacant_days })}
                    </div>
                  )}
                  {u.status === "occupied" && u.lease_renewal === false && u.lease_end_date && (
                    <div className="mt-1 text-xs text-amber-700">
                      {t("rental.units.freeFrom", { date: u.available_from ?? u.lease_end_date })}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  {u.tenant_name ?? "—"}
                  {u.balance > 0 && (
                    <div className="mt-1 text-xs text-destructive">
                      {t("rental.units.owes", { amount: u.balance.toFixed(2) })}
                    </div>
                  )}
                  {u.missing_readings_count > 0 && (
                    <div className="mt-1 text-xs text-amber-700">
                      {t("rental.units.missingReadings", { count: u.missing_readings_count })}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <Switch
                    checked={u.is_listed}
                    onCheckedChange={(v) => listedMutation.mutate({ id: u.id, is_listed: v })}
                    aria-label={t("rental.units.fListed")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={emptyUnit()}
        onSaved={() => refetch()}
      />
    </div>
  );
}
