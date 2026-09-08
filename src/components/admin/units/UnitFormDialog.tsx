import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/NumberInput";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { listBuildings, saveUnit } from "@/lib/units.functions";
import { UNIT_STATUSES, type UnitStatus } from "@/lib/rental";

export type UnitDraft = {
  id?: string;
  name: string;
  building_id: string | null;
  unit_number: string;
  floor: number | null;
  room_count: number;
  area_m2: number | null;
  monthly_rent: number;
  deposit: number;
  status: UnitStatus;
  address: string;
  city: string;
  country: string;
  description: string;
  location_note: string;
  notes: string;
  amenities: string[];
  cover_image_url: string;
  image_urls: string[];
  is_listed: boolean;
  is_active: boolean;
  sort_order: number;
};

export const emptyUnit = (): UnitDraft => ({
  name: "",
  building_id: null,
  unit_number: "",
  floor: null,
  room_count: 1,
  area_m2: null,
  monthly_rent: 0,
  deposit: 0,
  status: "vacant",
  address: "",
  city: "",
  country: "",
  description: "",
  location_note: "",
  notes: "",
  amenities: [],
  cover_image_url: "",
  image_urls: [],
  is_listed: false,
  is_active: true,
  sort_order: 0,
});

export function UnitFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: UnitDraft;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<UnitDraft>(initial);
  useEffect(() => setForm(initial), [initial, open]);

  const fetchBuildings = useServerFn(listBuildings);
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => fetchBuildings(),
  });
  const save = useServerFn(saveUnit);

  const m = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success(t("rental.units.saved"));
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof UnitDraft>(k: K, v: UnitDraft[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {form.id ? t("rental.units.editTitle") : t("rental.units.newTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <div className="md:col-span-2">
            <Label htmlFor="u-name">{t("rental.units.fName")}</Label>
            <Input
              id="u-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="u-building">{t("rental.units.fBuilding")}</Label>
            <select
              id="u-building"
              value={form.building_id ?? ""}
              onChange={(e) => set("building_id", e.target.value || null)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t("rental.units.noBuilding")}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="u-status">{t("rental.units.fStatus")}</Label>
            {/* Status is always a fixed list — it mirrors the database constraint. */}
            <select
              id="u-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as UnitStatus)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {UNIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`rental.status.${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="u-number">{t("rental.units.fUnitNumber")}</Label>
            <Input
              id="u-number"
              value={form.unit_number}
              onChange={(e) => set("unit_number", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="u-floor">{t("rental.units.fFloor")}</Label>
            <NumberInput
              id="u-floor"
              value={form.floor}
              emptyFallback={null}
              onChange={(n) => set("floor", n)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="u-rooms">{t("rental.units.fRooms")}</Label>
            <NumberInput
              id="u-rooms"
              min={0}
              value={form.room_count}
              emptyFallback={1}
              onChange={(n) => set("room_count", n ?? 1)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="u-area">{t("rental.units.fArea")}</Label>
            <NumberInput
              id="u-area"
              min={0}
              value={form.area_m2}
              emptyFallback={null}
              onChange={(n) => set("area_m2", n)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="u-rent">{t("rental.units.fRent")}</Label>
            <NumberInput
              id="u-rent"
              min={0}
              step="0.01"
              value={form.monthly_rent}
              emptyFallback={0}
              onChange={(n) => set("monthly_rent", n ?? 0)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="u-deposit">{t("rental.units.fDeposit")}</Label>
            <NumberInput
              id="u-deposit"
              min={0}
              step="0.01"
              value={form.deposit}
              emptyFallback={0}
              onChange={(n) => set("deposit", n ?? 0)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="u-address">{t("rental.units.fAddress")}</Label>
            <Input
              id="u-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="u-city">{t("rental.units.fCity")}</Label>
            <Input id="u-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="u-desc">{t("rental.units.fDescription")}</Label>
            <Textarea
              id="u-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="u-notes">{t("rental.units.fNotes")}</Label>
            <Textarea
              id="u-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("rental.units.notesHint")}</p>
          </div>

          <div className="md:col-span-2">
            <ImageUploader
              cover={form.cover_image_url}
              images={form.image_urls}
              folder={form.id ?? "new"}
              onChange={({ cover, images }) =>
                setForm((f) => ({ ...f, cover_image_url: cover, image_urls: images }))
              }
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              id="u-listed"
              checked={form.is_listed}
              onCheckedChange={(v) => set("is_listed", v)}
            />
            <Label htmlFor="u-listed">{t("rental.units.fListed")}</Label>
            <span className="text-xs text-muted-foreground">{t("rental.units.listedHint")}</span>
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              id="u-active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
            <Label htmlFor="u-active">{t("rental.units.fActive")}</Label>
          </div>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
