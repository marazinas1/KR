import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { NumberInput } from "@/components/NumberInput";
import { addRate, listRates } from "@/lib/rates.functions";
import { METER_TYPES, todayIso } from "@/lib/rental";

export function TariffsSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const fetchRates = useServerFn(listRates);
  const create = useServerFn(addRate);
  const { data: rates = [], refetch } = useQuery({ queryKey: ["utility-rates"], queryFn: () => fetchRates() });

  const [type, setType] = useState<(typeof METER_TYPES)[number]>("cold_water");
  const [from, setFrom] = useState(todayIso().slice(0, 7) + "-01");
  const [price, setPrice] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [note, setNote] = useState("");

  const m = useMutation({
    mutationFn: () => create({ data: { type, effective_from: from, price_per_unit: price, fixed_monthly: fixed, note } }),
    onSuccess: () => {
      toast.success(t("rental.tariffs.saved"));
      setNote("");
      refetch();
    },
    onError: (e) => toast.error(e.message === "RateExists" ? t("rental.tariffs.errExists") : e.message),
  });

  const today = todayIso();
  const currentByType = new Map<string, string>();
  for (const r of rates) {
    if (r.effective_from <= today && !currentByType.has(r.type)) currentByType.set(r.type, r.id);
  }

  return (
    <div className="space-y-6 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-medium">{t("rental.tariffs.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("rental.tariffs.subtitle")}</p>
      </div>

      {rates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rental.tariffs.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">{t("rental.tariffs.type")}</th>
                <th className="py-2 pr-3">{t("rental.tariffs.effectiveFrom")}</th>
                <th className="py-2 pr-3 text-right">{t("rental.tariffs.price")}</th>
                <th className="py-2 pr-3 text-right">{t("rental.tariffs.fixed")}</th>
                <th className="py-2">{t("rental.tariffs.note")}</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">
                    {t(`rental.meterType.${r.type}`)}
                    {currentByType.get(r.type) === r.id && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {t("rental.tariffs.current")}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{r.effective_from}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.price_per_unit.toFixed(4)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.fixed_monthly.toFixed(2)}</td>
                  <td className="py-2 text-muted-foreground">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label>{t("rental.tariffs.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METER_TYPES.map((mt) => (
                  <SelectItem key={mt} value={mt}>{t(`rental.meterType.${mt}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("rental.tariffs.effectiveFrom")}</Label>
            <DatePicker value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1">
            <Label>{t("rental.tariffs.price")}</Label>
            <NumberInput value={price} onChange={(v) => setPrice(v ?? 0)} step={0.0001} min={0} />
          </div>
          <div className="space-y-1">
            <Label>{t("rental.tariffs.fixed")}</Label>
            <NumberInput value={fixed} onChange={(v) => setFixed(v ?? 0)} step={0.01} min={0} />
          </div>
          <div className="space-y-1">
            <Label>{t("rental.tariffs.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="lg:col-span-5">
            <Button onClick={() => m.mutate()} disabled={m.isPending}>{t("rental.tariffs.add")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
