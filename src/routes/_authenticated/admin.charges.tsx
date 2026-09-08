import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { NumberInput } from "@/components/NumberInput";
import {
  addManualCharge,
  deleteCharge,
  generateCharges,
  getLeaseBalances,
  issueInvoiceFromCharges,
  issueInvoicesForPeriod,
  listCharges,
  listPayments,
  previewCharges,
  recordPayment,
} from "@/lib/charges.functions";
import { listLeases } from "@/lib/leases.functions";
import { currentPeriod, formatMoney, todayIso } from "@/lib/rental";

type Tab = "charges" | "payments" | "balances";
type Search = { period?: string; tab?: Tab; lease?: string };

export const Route = createFileRoute("/_authenticated/admin/charges")({
  component: ChargesPage,
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["period"] === "string" && /^\d{4}-\d{2}$/.test(s["period"])) out.period = s["period"];
    if (s["tab"] === "payments" || s["tab"] === "balances") out.tab = s["tab"];
    if (typeof s["lease"] === "string") out.lease = s["lease"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Mokesčiai — nuomos administravimas" },
      { name: "description", content: "Mėnesio priskaitymai, sąskaitos ir gauti mokėjimai pagal nuomos sutartis." },
    ],
  }),
});

function usePrettify() {
  const { t } = useTranslation();
  return (d: string) =>
    d.replace(/^(electricity_day|electricity_night|cold_water|hot_water|gas|heating)/, (m) => t(`rental.meterType.${m}`))
     .replace(/^rent\b/, t("rental.charges.kind.rent"));
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function ChargesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const period = search.period ?? currentPeriod().slice(0, 7);
  const tab: Tab = search.tab ?? "charges";
  const qc = useQueryClient();
  const prettify = usePrettify();

  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const fetchCharges = useServerFn(listCharges);
  const fetchPreview = useServerFn(previewCharges);
  const doGenerate = useServerFn(generateCharges);
  const doIssueAll = useServerFn(issueInvoicesForPeriod);
  const doIssueSel = useServerFn(issueInvoiceFromCharges);
  const doDelete = useServerFn(deleteCharge);
  const doAdd = useServerFn(addManualCharge);
  const fetchPayments = useServerFn(listPayments);
  const doPay = useServerFn(recordPayment);
  const fetchBalances = useServerFn(getLeaseBalances);
  const fetchLeases = useServerFn(listLeases);

  const [onlyUninvoiced, setOnlyUninvoiced] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ["admin-charges", period, search.lease],
    queryFn: () => fetchCharges({ data: { period, lease_id: search.lease } }),
  });
  const { data: leases = [] } = useQuery({
    queryKey: ["admin-leases-all"],
    queryFn: () => fetchLeases({ data: {} }),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments", search.lease],
    queryFn: () => fetchPayments({ data: { lease_id: search.lease } }),
    enabled: tab === "payments",
  });
  const { data: balances = {} } = useQuery({
    queryKey: ["admin-balances"],
    queryFn: () => fetchBalances({ data: {} }),
    enabled: tab === "balances",
  });

  const preview = useMutation({ mutationFn: () => fetchPreview({ data: { period } }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-charges"] });
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-balances"] });
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const generate = useMutation({
    mutationFn: () => doGenerate({ data: { period } }),
    onSuccess: (r) => {
      toast.success(t("rental.charges.generated", r));
      if (r.failed.length) toast.error(r.failed.join("\n"));
      preview.reset();
      invalidate();
    },
    onError: (e) => toast.error(`${t("rental.charges.generateFailed")}: ${e.message}`),
  });

  const mapInvoiceError = (e: Error) =>
    e.message === "ChargesSpanLeases"
      ? t("rental.charges.errSpanLeases")
      : e.message === "ChargeAlreadyInvoiced"
        ? t("rental.charges.errAlreadyInvoiced")
        : e.message;

  const issueAll = useMutation({
    mutationFn: () => doIssueAll({ data: { period } }),
    onSuccess: (r) => {
      toast.success(t("rental.charges.issued", r));
      r.results.filter((x) => x.error).forEach((x) => toast.error(x.error!));
      invalidate();
    },
    onError: (e) => toast.error(mapInvoiceError(e)),
  });
  const issueSel = useMutation({
    mutationFn: () => doIssueSel({ data: { charge_ids: [...selected] } }),
    onSuccess: (r) => {
      toast.success(t("rental.charges.issuedOne", { number: r.full_number }));
      setSelected(new Set());
      invalidate();
    },
    onError: (e) => toast.error(mapInvoiceError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => {
      toast.success(t("rental.charges.deleted"));
      invalidate();
    },
    onError: (e) => toast.error(e.message === "ChargeInvoiced" ? t("rental.charges.errInvoiced") : e.message),
  });

  const rows = useMemo(
    () => (onlyUninvoiced ? charges.filter((c) => !c.invoice_id) : charges),
    [charges, onlyUninvoiced],
  );
  const total = rows.reduce((s, c) => s + c.amount, 0);
  const leaseLabel = useMemo(
    () => new Map(leases.map((l) => [l.id, `${l.unit_name} · ${l.tenant_name}`])),
    [leases],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("rental.charges.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("rental.charges.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSearch({ period: shiftMonth(period, -1) })}>‹</Button>
          <span className="min-w-[7rem] text-center font-medium tabular-nums">{period}</span>
          <Button variant="outline" size="sm" onClick={() => setSearch({ period: shiftMonth(period, 1) })}>›</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b">
        {(["charges", "payments", "balances"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSearch({ tab: k === "charges" ? undefined : k })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
          >
            {t(`rental.charges.tabs.${k}`)}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2 py-1">
          <Select value={search.lease ?? "all"} onValueChange={(v) => setSearch({ lease: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-64"><SelectValue placeholder={t("rental.charges.lease")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("rental.charges.allLeases")}</SelectItem>
              {leases.map((l) => (
                <SelectItem key={l.id} value={l.id}>{leaseLabel.get(l.id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPayOpen(true)}>{t("rental.charges.recordPayment")}</Button>
        </div>
      </div>

      {tab === "charges" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => preview.mutate()} disabled={preview.isPending}>
              {t("rental.charges.preview")}
            </Button>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {t("rental.charges.generate")}
            </Button>
            <Button variant="secondary" onClick={() => issueAll.mutate()} disabled={issueAll.isPending}>
              {t("rental.charges.issueAll")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => issueSel.mutate()}
              disabled={selected.size === 0 || issueSel.isPending}
            >
              {t("rental.charges.issueSelected")} ({selected.size})
            </Button>
            <Button variant="ghost" onClick={() => setAddOpen(true)}>{t("rental.charges.addManual")}</Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Checkbox checked={onlyUninvoiced} onCheckedChange={(v) => setOnlyUninvoiced(Boolean(v))} />
              {t("rental.charges.onlyUninvoiced")}
            </label>
          </div>

          {preview.data && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{t("rental.charges.previewTitle")}</h2>
                <span className="font-medium tabular-nums">{formatMoney(preview.data.total)}</span>
              </div>
              {preview.data.lines.length === 0 && <p className="text-muted-foreground">{t("rental.charges.previewEmpty")}</p>}
              {preview.data.lines.length > 0 && (
                <ul className="max-h-72 space-y-1 overflow-auto">
                  {preview.data.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="truncate">
                        {leaseLabel.get(l.lease_id) ?? l.lease_id.slice(0, 8)} · {t(`rental.charges.kind.${l.kind}`)} · {prettify(l.description)}
                      </span>
                      <span className="tabular-nums">{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.data.blocked.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
                  <p className="font-medium text-destructive">{t("rental.charges.blockedTitle")}</p>
                  <ul className="mt-1 space-y-0.5">
                    {preview.data.blocked.map((b, i) => (
                      <li key={i}>
                        {t(`rental.meterType.${b.meter_type}`)} — {t(`rental.charges.blocked.${b.reason}`, { type: t(`rental.meterType.${b.meter_type}`), period: b.period.slice(0, 7) })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-8" />
                  <th className="p-2">{t("rental.charges.cols.unit")}</th>
                  <th className="p-2">{t("rental.charges.cols.tenant")}</th>
                  <th className="p-2">{t("rental.charges.cols.kind")}</th>
                  <th className="p-2">{t("rental.charges.cols.description")}</th>
                  <th className="p-2 text-right">{t("rental.charges.cols.qty")}</th>
                  <th className="p-2 text-right">{t("rental.charges.cols.price")}</th>
                  <th className="p-2 text-right">{t("rental.charges.cols.amount")}</th>
                  <th className="p-2">{t("rental.charges.cols.invoice")}</th>
                  <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={10} className="p-4 text-muted-foreground">{t("common.loading")}</td></tr>}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={10} className="p-4 text-muted-foreground">{t("rental.charges.empty")}</td></tr>
                )}
                {rows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">
                      {!c.invoice_id && <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />}
                    </td>
                    <td className="p-2">
                      <Link to="/admin/units/$id" params={{ id: c.unit_id }} className="underline-offset-2 hover:underline">
                        {c.unit_name}
                      </Link>
                    </td>
                    <td className="p-2">{c.tenant_name}</td>
                    <td className="p-2">{t(`rental.charges.kind.${c.kind}`)}</td>
                    <td className="p-2 text-muted-foreground">{prettify(c.description)}</td>
                    <td className="p-2 text-right tabular-nums">{c.quantity}</td>
                    <td className="p-2 text-right tabular-nums">{c.unit_price.toFixed(4)}</td>
                    <td className="p-2 text-right font-medium tabular-nums">{formatMoney(c.amount)}</td>
                    <td className="p-2">
                      {c.invoice_id ? (
                        <Link to="/admin/invoices" className="text-primary underline-offset-2 hover:underline">✓</Link>
                      ) : (
                        t("rental.charges.noInvoice")
                      )}
                    </td>
                    <td className="p-2">
                      {!c.invoice_id && (
                        <Button variant="ghost" size="icon" aria-label={t("rental.charges.delete")} onClick={() => remove.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td colSpan={7} className="p-2 text-right">{t("rental.charges.total")}</td>
                    <td className="p-2 text-right tabular-nums">{formatMoney(total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {tab === "payments" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">{t("rental.charges.cols.date")}</th>
                <th className="p-2">{t("rental.charges.cols.unit")}</th>
                <th className="p-2">{t("rental.charges.cols.tenant")}</th>
                <th className="p-2">{t("rental.charges.cols.method")}</th>
                <th className="p-2">{t("rental.charges.cols.reference")}</th>
                <th className="p-2 text-right">{t("rental.charges.cols.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-muted-foreground">{t("rental.charges.paymentsEmpty")}</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.paid_at}</td>
                  <td className="p-2">{p.unit_name}</td>
                  <td className="p-2">{p.tenant_name}</td>
                  <td className="p-2">{t(`rental.charges.method.${p.method}`)}</td>
                  <td className="p-2 text-muted-foreground">{p.reference || p.note}</td>
                  <td className="p-2 text-right font-medium tabular-nums">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "balances" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">{t("rental.charges.lease")}</th>
                <th className="p-2 text-right">{t("rental.charges.balance.charged")}</th>
                <th className="p-2 text-right">{t("rental.charges.balance.paid")}</th>
                <th className="p-2 text-right">{t("rental.charges.balance.balance")}</th>
                <th className="p-2 text-right">{t("rental.charges.balance.upcoming")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(balances)
                .filter(([id]) => !search.lease || id === search.lease)
                .sort((a, b) => b[1].balance - a[1].balance)
                .map(([id, b]) => (
                  <tr key={id} className="border-t">
                    <td className="p-2">{leaseLabel.get(id) ?? id.slice(0, 8)}</td>
                    <td className="p-2 text-right tabular-nums">{formatMoney(b.charged)}</td>
                    <td className="p-2 text-right tabular-nums">{formatMoney(b.paid)}</td>
                    <td className={`p-2 text-right font-medium tabular-nums ${b.balance > 0 ? "text-destructive" : ""}`}>
                      {formatMoney(b.balance)}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">{formatMoney(b.upcoming)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        leases={leases.map((l) => ({ id: l.id, label: leaseLabel.get(l.id) ?? l.id }))}
        defaultLease={search.lease}
        onSave={async (v) => {
          await doPay({ data: v });
          toast.success(t("rental.charges.paymentSaved"));
          invalidate();
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("rental.charges.manualTitle")}</DialogTitle></DialogHeader>
          <ManualChargeForm
            leases={leases.map((l) => ({ id: l.id, label: leaseLabel.get(l.id) ?? l.id }))}
            defaultLease={search.lease}
            period={period}
            onSave={async (v) => {
              await doAdd({ data: v });
              setAddOpen(false);
              invalidate();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LeaseOpt = { id: string; label: string };

export function PaymentDialog({
  open,
  onOpenChange,
  leases,
  defaultLease,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leases: LeaseOpt[];
  defaultLease?: string;
  onSave: (v: { lease_id: string; paid_at: string; amount: number; method: "bank" | "cash" | "other"; reference: string; note: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [lease, setLease] = useState(defaultLease ?? "");
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"bank" | "cash" | "other">("bank");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: () => onSave({ lease_id: lease || defaultLease || "", paid_at: date, amount, method, reference, note }),
    onSuccess: () => {
      onOpenChange(false);
      setAmount(0);
      setReference("");
      setNote("");
    },
    onError: (e) => toast.error(e.message),
  });
  const leaseValue = lease || defaultLease || "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("rental.charges.paymentTitle")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {leases.length > 1 || !defaultLease ? (
            <div className="space-y-1">
              <Label>{t("rental.charges.lease")}</Label>
              <Select value={leaseValue} onValueChange={setLease}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {leases.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("rental.charges.cols.date")}</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1">
              <Label>{t("rental.charges.amount")}</Label>
              <NumberInput value={amount} onChange={(v) => setAmount(v ?? 0)} step={0.01} min={0} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("rental.charges.cols.method")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["bank", "cash", "other"] as const).map((k) => (
                  <SelectItem key={k} value={k}>{t(`rental.charges.method.${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("rental.charges.cols.reference")}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("rental.charges.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={() => m.mutate()} disabled={!leaseValue || amount <= 0 || m.isPending}>
            {t("rental.charges.recordPayment")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualChargeForm({
  leases,
  defaultLease,
  period,
  onSave,
}: {
  leases: LeaseOpt[];
  defaultLease?: string;
  period: string;
  onSave: (v: { lease_id: string; period: string; kind: "one_off" | "penalty"; description: string; amount: number }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [lease, setLease] = useState(defaultLease ?? "");
  const [kind, setKind] = useState<"one_off" | "penalty">("one_off");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const m = useMutation({
    mutationFn: () => onSave({ lease_id: lease, period, kind, description, amount }),
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="grid gap-3">
      <div className="space-y-1">
        <Label>{t("rental.charges.lease")}</Label>
        <Select value={lease} onValueChange={setLease}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {leases.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{t("rental.charges.cols.kind")}</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="one_off">{t("rental.charges.kind.one_off")}</SelectItem>
            <SelectItem value="penalty">{t("rental.charges.kind.penalty")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{t("rental.charges.cols.description")}</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{t("rental.charges.amount")}</Label>
        <NumberInput value={amount} onChange={(v) => setAmount(v ?? 0)} step={0.01} min={0} />
      </div>
      <Button onClick={() => m.mutate()} disabled={!lease || !description.trim() || amount <= 0 || m.isPending}>
        {t("rental.charges.add")}
      </Button>
    </div>
  );
}
