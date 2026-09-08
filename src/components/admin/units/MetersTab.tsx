import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { addReading, listUnitMeters, reviewReading, saveMeter, signMeterPhoto } from "@/lib/meters.functions";
import { METER_TYPES, todayIso, type MeterType } from "@/lib/rental";

export function MetersTab({ unitId, buildingId }: { unitId: string; buildingId: string | null }) {
  const { t } = useTranslation();
  const fetchMeters = useServerFn(listUnitMeters);
  const add = useServerFn(addReading);
  const review = useServerFn(reviewReading);
  const save = useServerFn(saveMeter);
  const sign = useServerFn(signMeterPhoto);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["unit-meters", unitId],
    queryFn: () => fetchMeters({ data: { unit_id: unitId, building_id: buildingId } }),
  });

  const [newMeter, setNewMeter] = useState({
    type: "electricity_day" as MeterType,
    serial_number: "",
    uom: "kWh",
    initial_reading: 0,
  });

  const createMeter = useMutation({
    mutationFn: () => save({ data: { unit_id: unitId, ...newMeter } }),
    onSuccess: () => {
      toast.success(t("rental.meters.added"));
      setNewMeter({ ...newMeter, serial_number: "" });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addValue = useMutation({
    mutationFn: (v: { meter_id: string; value: number }) =>
      add({ data: { meter_id: v.meter_id, period: todayIso(), value: v.value, note: "" } }),
    onSuccess: () => {
      toast.success(t("rental.meters.readingSaved"));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewOne = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) => review({ data: v }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  const openPhoto = async (path: string) => {
    try {
      const { url } = await sign({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  const meters = data?.meters ?? [];
  const readings = data?.readings ?? [];

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          createMeter.mutate();
        }}
      >
        <div>
          <Label htmlFor="m-type">{t("rental.meters.type")}</Label>
          <select
            id="m-type"
            value={newMeter.type}
            onChange={(e) => setNewMeter({ ...newMeter, type: e.target.value as MeterType })}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {METER_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`rental.meterType.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="m-serial">{t("rental.meters.serial")}</Label>
          <Input
            id="m-serial"
            value={newMeter.serial_number}
            onChange={(e) => setNewMeter({ ...newMeter, serial_number: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="m-uom">{t("rental.meters.uom")}</Label>
          <Input
            id="m-uom"
            className="w-24"
            value={newMeter.uom}
            onChange={(e) => setNewMeter({ ...newMeter, uom: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="m-init">{t("rental.meters.initial")}</Label>
          <NumberInput
            id="m-init"
            min={0}
            step="0.001"
            value={newMeter.initial_reading}
            emptyFallback={0}
            onChange={(n) => setNewMeter({ ...newMeter, initial_reading: n ?? 0 })}
            className="h-10 w-32 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <Button type="submit" disabled={createMeter.isPending}>
          {t("rental.meters.add")}
        </Button>
      </form>

      {meters.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("rental.meters.empty")}</p>
      )}

      {meters.map((m) => {
        const own = readings.filter((r) => r.meter_id === m.id);
        const shared = m.building_id !== null;
        return (
          <div key={m.id} className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 p-3">
              <div>
                <p className="font-medium">
                  {t(`rental.meterType.${m.type}`)}
                  {shared ? ` · ${t("rental.meters.shared")}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.serial_number || "—"} · {m.uom} · {t("rental.meters.initial")}:{" "}
                  {Number(m.initial_reading)}
                </p>
              </div>
              {!shared && <ReadingForm onSubmit={(v) => addValue.mutate({ meter_id: m.id, value: v })} />}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="p-2">{t("rental.meters.period")}</th>
                  <th className="p-2">{t("rental.meters.value")}</th>
                  <th className="p-2">{t("rental.meters.consumption")}</th>
                  <th className="p-2">{t("rental.meters.status")}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {own.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-2 text-muted-foreground">
                      {t("rental.meters.noReadings")}
                    </td>
                  </tr>
                )}
                {own.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{String(r.period).slice(0, 7)}</td>
                    <td className="p-2">{Number(r.value)}</td>
                    <td className="p-2">{Number(r.consumption)}</td>
                    <td className="p-2">
                      {t(`rental.readingStatus.${r.status}`)}
                      {r.needs_review && (
                        <span className="ml-1 text-xs text-amber-700">
                          {t("rental.meters.needsReview")}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {r.photo_path && (
                        <Button size="sm" variant="ghost" onClick={() => openPhoto(r.photo_path)}>
                          {t("rental.meters.photo")}
                        </Button>
                      )}
                      {r.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => reviewOne.mutate({ id: r.id, status: "approved" })}
                          >
                            {t("rental.meters.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => reviewOne.mutate({ id: r.id, status: "rejected" })}
                          >
                            {t("rental.meters.reject")}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function ReadingForm({ onSubmit }: { onSubmit: (value: number) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState<number | null>(null);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value === null) return;
        onSubmit(value);
        setValue(null);
      }}
    >
      <NumberInput
        min={0}
        step="0.001"
        value={value}
        emptyFallback={null}
        placeholder={t("rental.meters.value")}
        onChange={setValue}
        className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
        inputMode="decimal"
      />
      <Button size="sm" type="submit">
        {t("rental.meters.addReading")}
      </Button>
    </form>
  );
}
