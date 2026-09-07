import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  listBookings,
  deleteBooking,
  rescheduleBooking,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL_KEYS,
  BOOKING_SOURCE_LABEL_KEYS,
} from "@/lib/bookings.functions";
import { listAllProperties } from "@/lib/properties.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Plus, Pencil, Trash2, LayoutGrid, List, Eye, Filter, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { BookingsGantt } from "@/components/admin/BookingsGantt";

export const Route = createFileRoute("/_authenticated/admin/bookings/")({
  component: BookingsPage,
});

const STATUS_CLASS: Record<string, string> = {
  confirmed: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

function durationDays(from?: string | null, to?: string | null) {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86400000));
}

function BookingsPage() {
  const { t } = useTranslation();
  const fetchBookings = useServerFn(listBookings);
  const fetchProps = useServerFn(listAllProperties);
  const del = useServerFn(deleteBooking);
  const reschedule = useServerFn(rescheduleBooking);
  const qc = useQueryClient();
  const [view, setView] = useState<"timeline" | "list">("timeline");

  const q = useQuery({
    queryKey: ["admin-bookings", {}],
    queryFn: () => fetchBookings({ data: {} }),
  });
  const propsQ = useQuery({ queryKey: ["admin-props-all"], queryFn: () => fetchProps() });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success(t("bookings.deleted"));
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("bookings.error")),
  });

  const rescheduleM = useMutation({
    mutationFn: (v: { id: string; property_id: string; date_from: string; date_to: string }) =>
      reschedule({ data: v }),
    onSuccess: () => {
      toast.success(t("bookings.rescheduled"));
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("bookings.error")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("bookings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {q.data ? t("bookings.found", { count: q.data.length }) : t("common.loading")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5">
            <Button size="sm" variant={view === "timeline" ? "default" : "ghost"} onClick={() => setView("timeline")} className="h-8">
              <LayoutGrid className="h-4 w-4 mr-1" /> {t("bookings.viewCalendar")}
            </Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")} className="h-8">
              <List className="h-4 w-4 mr-1" /> {t("bookings.viewList")}
            </Button>
          </div>
          <Button asChild>
            <Link to="/admin/bookings/new"><Plus className="h-4 w-4 mr-1" /> {t("bookings.new")}</Link>
          </Button>
        </div>
      </div>

      {view === "timeline" ? (
        <>
          {q.isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}
          {q.error && <div className="text-destructive">{(q.error as Error).message}</div>}
          {propsQ.data && q.data && (
            <BookingsGantt
              properties={(propsQ.data as any[]).map((p) => ({
                id: p.id,
                name: p.name,
                propertyType: p.propertyType ?? p.property_type,
              }))}
              bookings={q.data as any}
              onReschedule={(v) => rescheduleM.mutate(v)}
              rescheduling={rescheduleM.isPending}
            />
          )}
        </>
      ) : (
        <BookingsTable
          rows={(q.data as any[]) ?? []}
          loading={q.isLoading}
          onDelete={(id, name) => {
            if (confirm(t("bookings.confirmDelete", { name: name || "" }))) delM.mutate(id);
          }}
        />
      )}
    </div>
  );
}

type ColKey =
  | "status" | "booking_number" | "property" | "customer_name" | "customer_phone"
  | "customer_email" | "date_from" | "date_to" | "duration" | "total_amount";

type Row = any;

const COLUMNS: { key: ColKey; labelKey: string; align?: "left" | "right"; type: "set" | "text" | "date" | "number" }[] = [
  { key: "status", labelKey: "bookings.cols.status", type: "set" },
  { key: "booking_number", labelKey: "bookings.cols.booking_number", type: "set" },
  { key: "property", labelKey: "bookings.cols.property", type: "set" },
  { key: "customer_name", labelKey: "bookings.cols.customer_name", type: "set" },
  { key: "customer_phone", labelKey: "bookings.cols.customer_phone", type: "text" },
  { key: "customer_email", labelKey: "bookings.cols.customer_email", type: "text" },
  { key: "date_from", labelKey: "bookings.cols.date_from", type: "date" },
  { key: "date_to", labelKey: "bookings.cols.date_to", type: "date" },
  { key: "duration", labelKey: "bookings.cols.duration", type: "number", align: "right" },
  { key: "total_amount", labelKey: "bookings.cols.total_amount", type: "number", align: "right" },
];

function getCell(b: Row, key: ColKey): any {
  switch (key) {
    case "status": return b.status;
    case "booking_number": return b.booking_number ?? "";
    case "property": return b.properties?.name ?? "";
    case "customer_name": return b.customer_name ?? "";
    case "customer_phone": return b.customer_phone ?? "";
    case "customer_email": return b.customer_email ?? "";
    case "date_from": return b.date_from ?? "";
    case "date_to": return b.date_to ?? "";
    case "duration": return durationDays(b.date_from, b.date_to);
    case "total_amount": return Number(b.total_amount ?? 0);
  }
}

type SetFilter = { kind: "set"; values: string[] };
type TextFilter = { kind: "text"; value: string };
type RangeFilter = { kind: "range"; min: string; max: string };
type AnyFilter = SetFilter | TextFilter | RangeFilter;

function isFilterActive(f?: AnyFilter) {
  if (!f) return false;
  if (f.kind === "set") return f.values.length > 0;
  if (f.kind === "text") return f.value.trim() !== "";
  return f.min !== "" || f.max !== "";
}

function BookingsTable({ rows, loading, onDelete }: { rows: Row[]; loading: boolean; onDelete: (id: string, name: string) => void }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: ColKey; dir: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = useState<Record<string, AnyFilter>>({});
  const [viewRow, setViewRow] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    let out = rows.slice();
    for (const col of COLUMNS) {
      const f = filters[col.key];
      if (!isFilterActive(f)) continue;
      out = out.filter((r) => {
        const v = getCell(r, col.key);
        if (f.kind === "set") return f.values.includes(String(v ?? ""));
        if (f.kind === "text") return String(v ?? "").toLowerCase().includes(f.value.trim().toLowerCase());
        if (col.type === "date") {
          const sv = String(v ?? "");
          if (f.min && sv < f.min) return false;
          if (f.max && sv > f.max) return false;
          return true;
        }
        const n = Number(v ?? 0);
        if (f.min !== "" && n < Number(f.min)) return false;
        if (f.max !== "" && n > Number(f.max)) return false;
        return true;
      });
    }
    if (sort) {
      const { key, dir } = sort;
      out.sort((a, b) => {
        const av = getCell(a, key);
        const bv = getCell(b, key);
        if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
        return dir === "asc" ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
      });
    }
    return out;
  }, [rows, filters, sort]);

  const total = useMemo(() => filtered.reduce((s, r) => s + Number(r.total_amount ?? 0), 0), [filtered]);
  const anyFilter = Object.values(filters).some(isFilterActive);

  const toggleSort = (k: ColKey) => {
    setSort((s) => {
      if (!s || s.key !== k) return { key: k, dir: "asc" };
      if (s.dir === "asc") return { key: k, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="space-y-3">
      {anyFilter && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setFilters({})}>{t("bookings.clearAllFilters")}</Button>
        </div>
      )}

      {/* Mobile card list */}
      <div className="space-y-2 md:hidden">
        {loading && <div className="text-center text-muted-foreground py-8">{t("common.loading")}</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-8">{t("bookings.notFound")}</div>
        )}
        {filtered.map((b) => (
          <Link
            key={b.id}
            to="/admin/bookings/$id"
            params={{ id: b.id }}
            className="block rounded-lg border bg-card p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{b.booking_number ?? "—"}</span>
              <Badge variant="outline" className={STATUS_CLASS[b.status] ?? ""}>
                {BOOKING_STATUS_LABEL_KEYS[b.status] ? t(BOOKING_STATUS_LABEL_KEYS[b.status]) : b.status}
              </Badge>
            </div>
            <div className="mt-1 font-medium">{b.customer_name || "—"}</div>
            <div className="text-sm text-muted-foreground">{b.properties?.name ?? "—"}</div>
            <div className="mt-1 flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{b.date_from} – {b.date_to}</span>
              <span className="font-semibold text-primary">{Number(b.total_amount ?? 0).toFixed(2)} €</span>
            </div>
          </Link>
        ))}
        {!loading && filtered.length > 0 && (
          <div className="rounded-lg border bg-muted p-3 text-right text-sm font-medium">
            {t("bookings.totalRow", { count: filtered.length, sum: total.toFixed(2) })}
          </div>
        )}
      </div>

      <div className="hidden rounded-md border bg-card overflow-x-auto md:block">
        <Table className="min-w-[1400px]">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  <div className={`flex items-center gap-1 ${c.align === "right" ? "justify-end" : ""}`}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-primary"
                      onClick={() => toggleSort(c.key)}
                    >
                      {t(c.labelKey)}
                      {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                    <ColumnFilter
                      col={c}
                      rows={rows}
                      filter={filters[c.key]}
                      onChange={(f) => setFilters((prev) => {
                        const next = { ...prev };
                        if (f) next[c.key] = f; else delete next[c.key];
                        return next;
                      })}
                    />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right w-32">{t("bookings.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:nth-child(even)]:bg-muted/30">
            {loading && (
              <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground py-8">{t("common.loading")}</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground py-8">{t("bookings.notFound")}</TableCell></TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id} className="hover:bg-muted/60">
                <TableCell>
                  <Badge variant="outline" className={STATUS_CLASS[b.status] ?? ""}>
                    {BOOKING_STATUS_LABEL_KEYS[b.status] ? t(BOOKING_STATUS_LABEL_KEYS[b.status]) : b.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{b.booking_number ?? "—"}</TableCell>
                <TableCell className="font-medium">{b.properties?.name ?? "—"}</TableCell>
                <TableCell>{b.customer_name || "—"}</TableCell>
                <TableCell>{b.customer_phone || "—"}</TableCell>
                <TableCell className="text-sm">{b.customer_email || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{b.date_from}{b.check_in_time ? ` ${b.check_in_time}` : ""}</TableCell>
                <TableCell className="whitespace-nowrap">{b.date_to}{b.check_out_time ? ` ${b.check_out_time}` : ""}</TableCell>
                <TableCell className="text-right">{durationDays(b.date_from, b.date_to)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{Number(b.total_amount ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewRow(b)} title={t("bookings.view")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={t("bookings.edit")}>
                      <Link to="/admin/bookings/$id" params={{ id: b.id }}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(b.id, b.customer_name)} title={t("bookings.delete")}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-muted">
            <TableRow>
              <TableCell colSpan={COLUMNS.length + 1} className="text-right font-medium">
                {t("bookings.totalRow", { count: filtered.length, sum: total.toFixed(2) })}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <BookingViewDialog row={viewRow} onClose={() => setViewRow(null)} />
    </div>
  );
}

function ColumnFilter({ col, rows, filter, onChange }: {
  col: typeof COLUMNS[number];
  rows: Row[];
  filter?: AnyFilter;
  onChange: (f: AnyFilter | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = isFilterActive(filter);
  const [search, setSearch] = useState("");
  const [draftValues, setDraftValues] = useState<string[]>(filter?.kind === "set" ? filter.values : []);
  const [draftText, setDraftText] = useState(filter?.kind === "text" ? filter.value : "");
  const [draftMin, setDraftMin] = useState(filter?.kind === "range" ? filter.min : "");
  const [draftMax, setDraftMax] = useState(filter?.kind === "range" ? filter.max : "");

  const uniqueValues = useMemo(() => {
    if (col.type !== "set") return [];
    const set = new Set<string>();
    for (const r of rows) {
      const s = String(getCell(r, col.key) ?? "");
      if (s !== "") set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, col]);

  const displayLabel = (val: string) =>
    col.key === "status" && BOOKING_STATUS_LABEL_KEYS[val] ? t(BOOKING_STATUS_LABEL_KEYS[val]) : val;
  const filteredOptions = uniqueValues.filter((v) => displayLabel(v).toLowerCase().includes(search.toLowerCase()));

  const apply = () => {
    if (col.type === "set") {
      if (draftValues.length === 0) onChange(null);
      else onChange({ kind: "set", values: draftValues });
    } else if (col.type === "text") {
      if (!draftText.trim()) onChange(null);
      else onChange({ kind: "text", value: draftText });
    } else {
      if (!draftMin && !draftMax) onChange(null);
      else onChange({ kind: "range", min: draftMin, max: draftMax });
    }
    setOpen(false);
  };
  const clear = () => {
    setDraftValues([]); setDraftText(""); setDraftMin(""); setDraftMax(""); setSearch("");
    onChange(null);
    setOpen(false);
  };
  const onOpenChange = (o: boolean) => {
    if (o) {
      setSearch("");
      setDraftValues(filter?.kind === "set" ? filter.values : []);
      setDraftText(filter?.kind === "text" ? filter.value : "");
      setDraftMin(filter?.kind === "range" ? filter.min : "");
      setDraftMax(filter?.kind === "range" ? filter.max : "");
    }
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-background ${active ? "text-primary" : "text-muted-foreground"}`}
          title={t("bookings.filter")}
        >
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-2">
        {col.type === "set" && (
          <>
            <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="h-8" />
            <div className="max-h-56 overflow-y-auto space-y-1 border rounded p-2">
              {filteredOptions.length === 0 && <div className="text-xs text-muted-foreground">{t("bookings.noValues")}</div>}
              {filteredOptions.map((v) => {
                const checked = draftValues.includes(v);
                return (
                  <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => setDraftValues((prev) => c ? [...prev, v] : prev.filter((x) => x !== v))}
                    />
                    <span className="truncate">{displayLabel(v)}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
        {col.type === "text" && (
          <Input placeholder={t("common.search")} value={draftText} onChange={(e) => setDraftText(e.target.value)} className="h-8" />
        )}
        {(col.type === "date" || col.type === "number") && (
          <div className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("bookings.from")}</div>
              <Input type={col.type === "date" ? "date" : "number"} value={draftMin} onChange={(e) => setDraftMin(e.target.value)} className="h-8" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("bookings.to")}</div>
              <Input type={col.type === "date" ? "date" : "number"} value={draftMax} onChange={(e) => setDraftMax(e.target.value)} className="h-8" />
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={apply}>{t("bookings.apply")}</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={clear}>{t("bookings.clear")}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BookingViewDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bookings.dialog.title")}</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {row.booking_number && <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{row.booking_number}</span>}
              <Badge variant="outline" className={STATUS_CLASS[row.status] ?? ""}>
                {BOOKING_STATUS_LABEL_KEYS[row.status] ? t(BOOKING_STATUS_LABEL_KEYS[row.status]) : row.status}
              </Badge>
              <Badge variant="outline">
                {BOOKING_SOURCE_LABEL_KEYS[row.source] ? t(BOOKING_SOURCE_LABEL_KEYS[row.source]) : row.source}
              </Badge>
            </div>
            <FieldRow label={t("bookings.dialog.property")} value={row.properties?.name ?? "—"} />
            <FieldRow label={t("bookings.dialog.customer")} value={row.customer_name || "—"} />
            <FieldRow label={t("bookings.dialog.phone")} value={row.customer_phone || "—"} />
            <FieldRow label={t("bookings.dialog.email")} value={row.customer_email || "—"} />
            <FieldRow label={t("bookings.dialog.address")} value={row.customer_address || "—"} />
            <FieldRow label={t("bookings.dialog.idCode")} value={row.customer_id_code || "—"} />
            <FieldRow label={t("bookings.dialog.from")} value={`${row.date_from}${row.check_in_time ? ` ${row.check_in_time}` : ""}`} />
            <FieldRow label={t("bookings.dialog.to")} value={`${row.date_to}${row.check_out_time ? ` ${row.check_out_time}` : ""}`} />
            <FieldRow label={t("bookings.dialog.duration")} value={t("bookings.dialog.days", { value: durationDays(row.date_from, row.date_to) })} />
            <FieldRow label={t("bookings.dialog.location")} value={row.location || "—"} />
            <FieldRow label={t("bookings.dialog.guests")} value={String(row.guests ?? "—")} />
            <FieldRow label={t("bookings.dialog.amount")} value={`${Number(row.total_amount ?? 0).toFixed(2)} €`} />
            {row.note && <div className="pt-2 border-t italic text-muted-foreground">„{row.note}"</div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium sm:col-span-2">{value}</div>
    </div>
  );
}

void BOOKING_STATUSES;