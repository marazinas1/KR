import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Camera, Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyLease, getMyMeters, submitMyReading, type MyMeter } from "@/lib/tenant-portal.functions";
import { EVIDENCE_OPTIONS, uploadOptimizedToStorage } from "@/lib/image-optimize";

export const Route = createFileRoute("/_authenticated/nuomininkas/rodmenys")({
  component: ReadingsPage,
});

function ReadingsPage() {
  const { t } = useTranslation();
  const fetchMeters = useServerFn(getMyMeters);
  const fetchLease = useServerFn(getMyLease);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["my-meters"], queryFn: () => fetchMeters() });
  const { data: mine } = useQuery({ queryKey: ["my-lease"], queryFn: () => fetchLease() });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("tenant.submitReadings")}</h1>
        <p className="text-sm text-muted-foreground">{t("tenant.readingsPeriod", { period: data.period.slice(0, 7) })}</p>
      </div>
      {data.meters.length === 0 && (
        <div className="rounded-xl border bg-background p-5 text-sm">{t("tenant.noMeters")}</div>
      )}
      {data.meters.map((m) => (
        <MeterCard key={m.id} meter={m} unitId={mine?.unit?.id ?? ""} onDone={() => refetch()} />
      ))}
    </div>
  );
}

function MeterCard({ meter, unitId, onDone }: { meter: MyMeter; unitId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const submit = useServerFn(submitMyReading);
  const [value, setValue] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { meter_id: meter.id, value: Number(value.replace(",", ".")), photo_path: photoPath } }),
    onSuccess: () => {
      toast.success(t("tenant.readingSaved"));
      setValue("");
      setPhotoPath("");
      onDone();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "ReadingTooLow"
          ? t("tenant.readingTooLow")
          : e.message === "ReadingExists"
            ? t("tenant.readingExists")
            : e.message,
      ),
  });

  const onPhoto = async (file: File | undefined) => {
    if (!file || !unitId) return;
    setUploading(true);
    try {
      // Path: <unit_id>/<uuid>.webp — storage RLS checks the unit folder.
      const up = await uploadOptimizedToStorage(file, unitId, "meter-photos", EVIDENCE_OPTIONS);
      setPhotoPath(up.path);
    } catch {
      toast.error(t("tenant.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const cur = meter.current;
  const previous = meter.last_approved;
  const canSubmit = !cur || cur.status === "rejected";

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t(`rental.meterType.${meter.type}`)}</h2>
          <p className="text-xs text-muted-foreground">
            {t("tenant.serial", { serial: meter.serial_number })}
            {meter.shared ? ` · ${t("tenant.shared")}` : ""}
          </p>
        </div>
        {cur && <StatusPill status={cur.status} />}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {t("tenant.previous")}:{" "}
        <span className="font-medium text-foreground">
          {previous
            ? `${previous.value} ${meter.uom} (${previous.period.slice(0, 7)})`
            : t("tenant.noPrevious", { value: `${meter.initial_reading} ${meter.uom}` })}
        </span>
      </p>

      {cur && cur.status !== "rejected" ? (
        <p className="mt-3 text-sm">
          {t("tenant.alreadySubmitted", { value: `${cur.value} ${meter.uom}` })}
        </p>
      ) : null}

      {canSubmit && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value) return;
            mutation.mutate();
          }}
        >
          <label className="block">
            <span className="text-sm">{t("tenant.newReading")}</span>
            <input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 h-14 w-full rounded-md border bg-background px-4 text-2xl font-semibold tabular-nums"
              placeholder={previous ? String(previous.value) : String(meter.initial_reading)}
              required
            />
          </label>
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm">
            <Camera className="h-5 w-5" />
            {uploading ? t("common.loading") : photoPath ? t("tenant.photoAttached") : t("tenant.takePhoto")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
          <Button type="submit" className="h-12 w-full text-base" disabled={mutation.isPending || uploading || !value}>
            {t("tenant.submit")}
          </Button>
        </form>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const map = {
    submitted: { icon: Clock, cls: "bg-muted text-muted-foreground", label: t("tenant.submitted") },
    approved: { icon: Check, cls: "bg-primary/10 text-primary", label: t("tenant.approved") },
    rejected: { icon: X, cls: "bg-destructive/10 text-destructive", label: t("tenant.rejected") },
  } as const;
  const s = map[status as keyof typeof map] ?? map.submitted;
  const Icon = s.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ${s.cls}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}
