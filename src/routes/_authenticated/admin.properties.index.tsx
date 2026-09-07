import { useTranslation } from "react-i18next";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Users,
  BedDouble,
  Bed,
  Ruler,
  LayoutGrid,
  List as ListIcon,
  Copy,
  ImageOff,
  Plus,
} from "lucide-react";
import { listAllProperties, deleteProperty } from "@/lib/properties.functions";
import { PROPERTY_TYPES, propertyTypeLabelKey, hasOnlySingleBeds, type Property } from "@/lib/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { AutoTranslateAllButton } from "@/components/admin/AutoTranslateAllButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/properties/")({
  component: PropertiesList,
});

type ViewMode = "grid" | "table";
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name-asc" | "price-asc" | "price-desc" | "newest";

const VIEW_STORAGE_KEY = "admin-properties-view";

function PropertiesList() {
  const { t } = useTranslation();
  const fetchAll = useServerFn(listAllProperties);
  const remove = useServerFn(deleteProperty);
  const { data: props = [], refetch } = useQuery({
    queryKey: ["admin-all-properties"],
    queryFn: () => fetchAll(),
  });

  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (saved === "grid" || saved === "table") setView(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success(t("properties.deleted"));
      refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
    onSettled: () => setToDelete(null),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = props.filter((p) => {
      if (q && !`${p.name} ${p.city}`.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && p.propertyType !== typeFilter) return false;
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "inactive" && p.isActive) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "price-asc":
          return a.pricePerNight - b.pricePerNight;
        case "price-desc":
          return b.pricePerNight - a.pricePerNight;
        case "newest":
        default:
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }
    });
    return list;
  }, [props, search, typeFilter, statusFilter, sort]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const copyLink = async (id: string) => {
    try {
      const url = `${window.location.origin}/properties/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("properties.copied"));
    } catch {
      toast.error(t("properties.copyFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{t("properties.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("properties.count", { count: props.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutoTranslateAllButton />
          <Button asChild>
          <Link to="/admin/properties/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("properties.new")}</span>
          </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("properties.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder={t("properties.typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("properties.allTypes")}</SelectItem>
            {PROPERTY_TYPES.map((ty) => (
              <SelectItem key={ty.value} value={ty.value}>
                {t(ty.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder={t("properties.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("properties.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("properties.active")}</SelectItem>
            <SelectItem value="inactive">{t("properties.inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t("properties.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("properties.sortDefault")}</SelectItem>
            <SelectItem value="name-asc">{t("properties.sortNameAsc")}</SelectItem>
            <SelectItem value="price-asc">{t("properties.sortPriceAsc")}</SelectItem>
            <SelectItem value="price-desc">{t("properties.sortPriceDesc")}</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as ViewMode)}
          className="sm:ml-auto"
          variant="outline"
        >
          <ToggleGroupItem value="grid" aria-label={t("properties.viewGrid")}>
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label={t("properties.viewTable")}>
            <ListIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {props.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : view === "grid" ? (
        <GridView items={filtered} onDelete={setToDelete} onCopy={copyLink} />
      ) : (
        <TableView items={filtered} onDelete={setToDelete} onCopy={copyLink} />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? t("properties.deleteDesc", { name: toDelete.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && del.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? t("properties.active") : t("properties.inactive")}
    </Badge>
  );
}

function Thumb({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={cn("object-cover", className)} loading="lazy" />;
}

function RowActions({
  p,
  onDelete,
  onCopy,
}: {
  p: Property;
  onDelete: (v: { id: string; name: string }) => void;
  onCopy: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("properties.moreActions")}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onCopy(p.id)}>
          <Copy className="h-4 w-4" />
          {t("properties.copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete({ id: p.id, name: p.name })}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridView({
  items,
  onDelete,
  onCopy,
}: {
  items: Property[];
  onDelete: (v: { id: string; name: string }) => void;
  onCopy: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <Card key={p.id} className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
          <div className="relative">
            <Thumb src={p.image} alt={p.name} className="aspect-[4/3] w-full" />
            <div className="absolute left-3 top-3">
              <StatusBadge active={p.isActive} />
            </div>
          </div>
          <CardContent className="space-y-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{p.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {t(propertyTypeLabelKey(p.propertyType))}
                {p.city ? ` • ${p.city}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {p.maxGuests}
              </span>
              <span className="inline-flex items-center gap-1">
                {hasOnlySingleBeds(p.rooms) ? <Bed className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                {p.beds}
              </span>
              {p.areaM2 ? (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  {p.areaM2} m²
                </span>
              ) : null}
            </div>
            <div className="text-lg font-bold">
              {p.pricePerNight.toFixed(0)} €{" "}
              <span className="text-xs font-normal text-muted-foreground">{t("properties.perNight")}</span>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
            <Button asChild variant="secondary" size="sm" className="flex-1">
              <Link to="/admin/properties/$id/edit" params={{ id: p.id }}>
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Link>
            </Button>
            <RowActions p={p} onDelete={onDelete} onCopy={onCopy} />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function TableView({
  items,
  onDelete,
  onCopy,
}: {
  items: Property[];
  onDelete: (v: { id: string; name: string }) => void;
  onCopy: (id: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("properties.table.property")}</TableHead>
            <TableHead>{t("properties.table.type")}</TableHead>
            <TableHead>{t("properties.table.city")}</TableHead>
            <TableHead>{t("properties.table.capacity")}</TableHead>
            <TableHead className="text-right">{t("properties.table.price")}</TableHead>
            <TableHead>{t("properties.table.status")}</TableHead>
            <TableHead className="w-[120px] text-right">{t("properties.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <Thumb
                    src={p.image}
                    alt={p.name}
                    className="h-10 w-10 shrink-0 rounded-md"
                  />
                  <span className="truncate font-medium">{p.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t(propertyTypeLabelKey(p.propertyType))}
              </TableCell>
              <TableCell className="text-muted-foreground">{p.city || "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {p.maxGuests}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {hasOnlySingleBeds(p.rooms) ? <Bed className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                    {p.beds}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {p.pricePerNight.toFixed(0)} €
              </TableCell>
              <TableCell>
                <StatusBadge active={p.isActive} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.edit")}
                    onClick={() =>
                      navigate({ to: "/admin/properties/$id/edit", params: { id: p.id } })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.delete")}
                    onClick={() => onDelete({ id: p.id, name: p.name })}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <RowActions p={p} onDelete={onDelete} onCopy={onCopy} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed bg-card p-10 text-center">
      <h3 className="text-lg font-semibold">{t("properties.emptyTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("properties.emptyText")}</p>
      <Button asChild className="mt-4">
        <Link to="/admin/properties/new">
          <Plus className="h-4 w-4" />
          {t("properties.new")}
        </Link>
      </Button>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed bg-card p-10 text-center">
      <h3 className="text-lg font-semibold">{t("properties.noResultsTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("properties.noResultsText")}</p>
      <Button variant="outline" className="mt-4" onClick={onClear}>
        {t("properties.clearFilters")}
      </Button>
    </div>
  );
}