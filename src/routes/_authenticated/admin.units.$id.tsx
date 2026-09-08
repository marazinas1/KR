import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUnit, listUnitCosts, listUnitEvents, setUnitListed } from "@/lib/units.functions";
import { LeasePanel } from "@/components/admin/units/LeasePanel";
import { MetersTab } from "@/components/admin/units/MetersTab";
import { IssuesTab } from "@/components/admin/units/IssuesTab";
import { DocumentsTab } from "@/components/admin/units/DocumentsTab";
import { UnitFormDialog, emptyUnit, type UnitDraft } from "@/components/admin/units/UnitFormDialog";

const TABS = ["overview", "lease", "meters", "issues", "documents", "costs", "timeline"] as const;

export const Route = createFileRoute("/_authenticated/admin/units/$id")({
  component: UnitDetail,
  validateSearch: (s: Record<string, unknown>): { tab?: (typeof TABS)[number] } =>
    TABS.includes(s["tab"] as never) ? { tab: s["tab"] as (typeof TABS)[number] } : {},
  head: () => ({
    meta: [
      { title: "Buto kortelė — nuomos administravimas" },
      {
        name: "description",
        content: "Buto apžvalga, nuomos sutartis, skaitliukai, gedimai, dokumentai ir istorija.",
      },
    ],
  }),
});

function UnitDetail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const { t } = useTranslation();
  const fetchUnit = useServerFn(getUnit);
  const toggleListed = useServerFn(setUnitListed);
  const [editOpen, setEditOpen] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["unit", id],
    queryFn: () => fetchUnit({ data: { id } }),
  });

  const listed = useMutation({
    mutationFn: (v: boolean) => toggleListed({ data: { id, is_listed: v } }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  const u = data.unit;
  const draft: UnitDraft = {
    ...emptyUnit(),
    id: u.id,
    name: u.name,
    building_id: u.building_id,
    unit_number: u.unit_number,
    floor: u.floor,
    room_count: u.room_count,
    area_m2: u.area_m2,
    monthly_rent: Number(u.monthly_rent),
    deposit: Number(u.deposit),
    status: u.status as UnitDraft["status"],
    address: u.address,
    city: u.city,
    country: u.country,
    description: u.description,
    location_note: u.location_note,
    notes: u.notes,
    amenities: (u.amenities as unknown as string[]) ?? [],
    cover_image_url: u.cover_image_url,
    image_urls: (u.image_urls as unknown as string[]) ?? [],
    is_listed: u.is_listed,
    is_active: u.is_active,
    sort_order: u.sort_order,
  };

  return (
    <div>
      <Link to="/admin/units" className="inline-flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("rental.units.title")}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{u.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[data.building?.name, u.unit_number, u.address, u.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={u.is_listed} onCheckedChange={(v) => listed.mutate(v)} />
            {t("rental.units.fListed")}
          </label>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t("common.edit")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t("rental.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="lease">{t("rental.tabs.lease")}</TabsTrigger>
          <TabsTrigger value="meters">{t("rental.tabs.meters")}</TabsTrigger>
          <TabsTrigger value="issues">{t("rental.tabs.issues")}</TabsTrigger>
          <TabsTrigger value="documents">{t("rental.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="costs">{t("rental.tabs.costs")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("rental.tabs.timeline")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("rental.units.fStatus")} value={t(`rental.status.${u.status}`)} />
            <Fact label={t("rental.units.fRent")} value={`${Number(u.monthly_rent).toFixed(2)} €`} />
            <Fact label={t("rental.units.fDeposit")} value={`${Number(u.deposit).toFixed(2)} €`} />
            <Fact label={t("rental.units.fRooms")} value={String(u.room_count)} />
            <Fact label={t("rental.units.fArea")} value={u.area_m2 ? `${u.area_m2} m²` : "—"} />
            <Fact label={t("rental.units.fFloor")} value={u.floor === null ? "—" : String(u.floor)} />
          </div>
          {u.description && <p className="mt-4 text-sm">{u.description}</p>}
          {u.notes && (
            <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">{t("rental.units.fNotes")}</p>
              {u.notes}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lease" className="mt-4">
          <LeasePanel
            unitId={id}
            defaultRent={Number(u.monthly_rent)}
            defaultDeposit={Number(u.deposit)}
            onChanged={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="meters" className="mt-4">
          <MetersTab unitId={id} buildingId={u.building_id} />
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <IssuesTab unitId={id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab unitId={id} />
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <CostsTab unitId={id} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineTab unitId={id} />
        </TabsContent>
      </Tabs>

      <UnitFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={draft}
        onSaved={() => refetch()}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function CostsTab({ unitId }: { unitId: string }) {
  const { t } = useTranslation();
  const fetchCosts = useServerFn(listUnitCosts);
  const { data } = useQuery({
    queryKey: ["unit-costs", unitId],
    queryFn: () => fetchCosts({ data: { unit_id: unitId } }),
  });
  if (!data) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  const total =
    data.expenses.reduce((s, e) => s + Number(e.amount), 0) +
    data.investments.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {t("rental.costs.total")}: <strong>{total.toFixed(2)} €</strong>
      </p>
      <Section title={t("rental.costs.expenses")}>
        {data.expenses.map((e) => (
          <Row key={e.id} left={`${e.expense_date} · ${e.category}`} right={`${Number(e.amount).toFixed(2)} €`} note={e.note} />
        ))}
      </Section>
      <Section title={t("rental.costs.investments")}>
        {data.investments.map((e) => (
          <Row key={e.id} left={`${e.purchase_date} · ${e.category}`} right={`${Number(e.amount).toFixed(2)} €`} note={e.note} />
        ))}
      </Section>
      <Section title={t("rental.costs.maintenance")}>
        {data.maintenance.map((e) => (
          <Row
            key={e.id}
            left={`${e.type}`}
            right={e.due_date ?? e.last_done_at ?? "—"}
            note={e.note}
          />
        ))}
      </Section>
    </div>
  );
}

function TimelineTab({ unitId }: { unitId: string }) {
  const { t } = useTranslation();
  const fetchEvents = useServerFn(listUnitEvents);
  const { data: events = [] } = useQuery({
    queryKey: ["unit-events", unitId],
    queryFn: () => fetchEvents({ data: { unit_id: unitId } }),
  });
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">{t("rental.timeline.empty")}</p>;
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="rounded border p-2 text-sm">
          <span className="font-medium">{t(`rental.eventKind.${e.kind}`, { defaultValue: e.kind })}</span>{" "}
          · {String(e.started_at).slice(0, 10)}
          {e.ended_at ? ` — ${String(e.ended_at).slice(0, 10)}` : ""}
          {e.note ? ` · ${e.note}` : ""}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const items = Array.isArray(children) ? children : [children];
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {items.flat().filter(Boolean).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rental.costs.empty")}</p>
      ) : (
        <ul className="mt-1 divide-y rounded border">{children}</ul>
      )}
    </div>
  );
}

function Row({ left, right, note }: { left: string; right: string; note?: string }) {
  return (
    <li className="flex items-center justify-between gap-2 p-2 text-sm">
      <span>
        {left}
        {note ? <span className="block text-xs text-muted-foreground">{note}</span> : null}
      </span>
      <span>{right}</span>
    </li>
  );
}
