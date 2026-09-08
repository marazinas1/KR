import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listBuildings, listUnits, setUnitListed } from "@/lib/units.functions";
import { UNIT_STATUSES } from "@/lib/rental";
import { UnitFormDialog, emptyUnit } from "@/components/admin/units/UnitFormDialog";

export const Route = createFileRoute("/_authenticated/admin/units/")({
  component: UnitsPage,
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

  const [q, setQ] = useState("");
  const [building, setBuilding] = useState("");
  const [status, setStatus] = useState("");
  const [listedOnly, setListedOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const listedMutation = useMutation({
    mutationFn: (v: { id: string; is_listed: boolean }) => toggleListed({ data: v }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return units.filter((u) => {
      if (building && u.building_id !== building) return false;
      if (status && u.status !== status) return false;
      if (listedOnly && !u.is_listed) return false;
      if (!needle) return true;
      return [u.name, u.unit_number, u.address, u.city, u.building_name, u.tenant_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [units, q, building, status, listedOnly]);

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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t("rental.units.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
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
          onChange={(e) => setStatus(e.target.value)}
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
          <Switch checked={listedOnly} onCheckedChange={setListedOnly} />
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
                      {t("rental.units.freeFrom", { date: u.lease_end_date })}
                    </div>
                  )}
                </td>
                <td className="p-2">{u.tenant_name ?? "—"}</td>
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
