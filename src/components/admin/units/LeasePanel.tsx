import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/DatePicker";
import { NumberInput } from "@/components/NumberInput";
import { listTenants } from "@/lib/tenants.functions";
import {
  createLease,
  listLeases,
  renewLease,
  setLeaseNotice,
  terminateLease,
  type LeaseRow,
} from "@/lib/leases.functions";
import { HOLDING_LEASE_STATUSES, todayIso } from "@/lib/rental";
import { ContractDialog } from "./ContractDialog";

function useLeaseError() {
  const { t } = useTranslation();
  return (e: Error) => {
    if (e.message === "LeaseOverlap") return toast.error(t("rental.lease.errOverlap"));
    if (e.message === "FutureTerminationNotAllowed")
      return toast.error(t("rental.lease.errFutureTermination"));
    if (e.message === "EndDateRequired") return toast.error(t("rental.lease.errEndDateRequired"));
    return toast.error(e.message);
  };
}

export function LeasePanel({
  unitId,
  defaultRent,
  defaultDeposit,
  onChanged,
}: {
  unitId: string;
  defaultRent: number;
  defaultDeposit: number;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const onError = useLeaseError();
  const fetchLeases = useServerFn(listLeases);
  const { data: leases = [], refetch } = useQuery({
    queryKey: ["unit-leases", unitId],
    queryFn: () => fetchLeases({ data: { unit_id: unitId } }),
  });

  const today = todayIso();
  const active = leases.find(
    (l) =>
      HOLDING_LEASE_STATUSES.includes(l.status as never) &&
      l.start_date <= today &&
      (!l.end_date || l.end_date >= today),
  );
  const history = leases.filter((l) => l.id !== active?.id);

  const [newOpen, setNewOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const done = () => {
    refetch();
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{t("rental.lease.current")}</h2>
        {!active && <Button onClick={() => setNewOpen(true)}>{t("rental.lease.new")}</Button>}
      </div>

      {!active && <p className="text-sm text-muted-foreground">{t("rental.lease.none")}</p>}

      {active && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("rental.lease.tenant")} value={active.tenant_name} />
            <Fact
              label={t("rental.lease.term")}
              value={`${active.start_date} — ${active.end_date ?? t("rental.lease.openEnded")}`}
            />
            <Fact label={t("rental.lease.rent")} value={`${active.monthly_rent.toFixed(2)} €`} />
            <Fact
              label={t("rental.lease.paymentDay")}
              value={t("rental.lease.dayOfMonth", { day: active.payment_day })}
            />
            <Fact label={t("rental.lease.deposit")} value={`${active.deposit.toFixed(2)} €`} />
            <Fact
              label={t("rental.lease.notice")}
              value={t("rental.lease.days", { count: active.notice_days })}
            />
            <Fact label={t("rental.lease.status")} value={t(`rental.leaseStatus.${active.status}`)} />
          </div>

          <NoticeBlock lease={active} onDone={done} />

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setRenewOpen(true)}>
              {t("rental.lease.renew")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/charges" search={{ lease: active.id }}>
                {t("rental.nav.charges")}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setContractOpen(true)}>
              {t("contracts.lease.action")}
            </Button>
            <Button variant="destructive" onClick={() => setTerminateOpen(true)}>
              {t("rental.lease.terminate")}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{t("rental.lease.history")}</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("rental.lease.noHistory")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((l) => (
              <li key={l.id} className="rounded border p-2 text-sm">
                <span className="font-medium">{l.tenant_name}</span> · {l.start_date} —{" "}
                {l.end_date ?? t("rental.lease.openEnded")} · {l.monthly_rent.toFixed(2)} € ·{" "}
                {t(`rental.leaseStatus.${l.status}`)}
                {l.termination_reason ? ` · ${l.termination_reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewLeaseDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        unitId={unitId}
        defaultRent={defaultRent}
        defaultDeposit={defaultDeposit}
        onSaved={done}
        onError={onError}
      />
      {active && (
        <RenewDialog
          open={renewOpen}
          onOpenChange={setRenewOpen}
          lease={active}
          onSaved={done}
          onError={onError}
        />
      )}
      {active && (
        <TerminateDialog
          open={terminateOpen}
          onOpenChange={setTerminateOpen}
          lease={active}
          onSaved={done}
          onError={onError}
        />
      )}
      {active && (
        <ContractDialog
          open={contractOpen}
          onOpenChange={setContractOpen}
          leaseId={active.id}
          onSaved={done}
        />
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/** Future move-out notice: renewal + end_date on the running lease. */
function NoticeBlock({ lease, onDone }: { lease: LeaseRow; onDone: () => void }) {
  const { t } = useTranslation();
  const onError = useLeaseError();
  const setNotice = useServerFn(setLeaseNotice);
  const [renewal, setRenewal] = useState(lease.renewal);
  const [endDate, setEndDate] = useState(lease.end_date ?? "");

  const m = useMutation({
    mutationFn: () =>
      setNotice({ data: { id: lease.id, renewal, end_date: renewal ? endDate || null : endDate } }),
    onSuccess: () => {
      toast.success(t("rental.lease.noticeSaved"));
      onDone();
    },
    onError,
  });

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Switch id="renewal" checked={renewal} onCheckedChange={setRenewal} />
        <Label htmlFor="renewal">{t("rental.lease.renewalFlag")}</Label>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t("rental.lease.endDate")}</Label>
          <DatePicker value={endDate} onChange={setEndDate} />
        </div>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}>
          {t("common.save")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {renewal ? t("rental.lease.renewalOnHint") : t("rental.lease.renewalOffHint")}
      </p>
    </div>
  );
}

function NewLeaseDialog({
  open,
  onOpenChange,
  unitId,
  defaultRent,
  defaultDeposit,
  onSaved,
  onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unitId: string;
  defaultRent: number;
  defaultDeposit: number;
  onSaved: () => void;
  onError: (e: Error) => void;
}) {
  const { t } = useTranslation();
  const fetchTenants = useServerFn(listTenants);
  const { data: tenants = [] } = useQuery({ queryKey: ["tenants"], queryFn: () => fetchTenants() });
  const create = useServerFn(createLease);

  const [form, setForm] = useState({
    tenant_id: "",
    start_date: todayIso(),
    end_date: "",
    monthly_rent: defaultRent,
    deposit: defaultDeposit,
    deposit_paid: 0,
    payment_day: 1,
    notice_days: 30,
    notes: "",
    status: "active" as "active" | "draft",
  });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          unit_id: unitId,
          ...form,
          end_date: form.end_date || null,
          renewal: true,
        },
      }),
    onSuccess: () => {
      toast.success(t("rental.lease.created"));
      onOpenChange(false);
      onSaved();
    },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rental.lease.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="l-tenant">{t("rental.lease.tenant")}</Label>
            <select
              id="l-tenant"
              required
              value={form.tenant_id}
              onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t("rental.lease.selectTenant")}</option>
              {tenants.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.first_name} {x.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("rental.lease.startDate")}</Label>
            <DatePicker
              value={form.start_date}
              onChange={(v) => setForm({ ...form, start_date: v })}
              required
            />
          </div>
          <div>
            <Label>{t("rental.lease.endDate")}</Label>
            <DatePicker
              value={form.end_date}
              onChange={(v) => setForm({ ...form, end_date: v })}
            />
          </div>
          <div>
            <Label htmlFor="l-rent">{t("rental.lease.rent")}</Label>
            <NumberInput
              id="l-rent"
              min={0}
              step="0.01"
              value={form.monthly_rent}
              emptyFallback={0}
              onChange={(n) => setForm({ ...form, monthly_rent: n ?? 0 })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="l-deposit">{t("rental.lease.deposit")}</Label>
            <NumberInput
              id="l-deposit"
              min={0}
              step="0.01"
              value={form.deposit}
              emptyFallback={0}
              onChange={(n) => setForm({ ...form, deposit: n ?? 0 })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="l-day">{t("rental.lease.paymentDay")}</Label>
            <NumberInput
              id="l-day"
              min={1}
              max={28}
              value={form.payment_day}
              emptyFallback={1}
              onChange={(n) => setForm({ ...form, payment_day: n ?? 1 })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="l-notice">{t("rental.lease.notice")}</Label>
            <NumberInput
              id="l-notice"
              min={0}
              value={form.notice_days}
              emptyFallback={30}
              onChange={(n) => setForm({ ...form, notice_days: n ?? 30 })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="l-notes">{t("rental.lease.notes")}</Label>
            <Textarea
              id="l-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={m.isPending || !form.tenant_id}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenewDialog({
  open,
  onOpenChange,
  lease,
  onSaved,
  onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lease: LeaseRow;
  onSaved: () => void;
  onError: (e: Error) => void;
}) {
  const { t } = useTranslation();
  const renew = useServerFn(renewLease);
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState(lease.monthly_rent);
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () =>
      renew({
        data: { id: lease.id, new_end_date: endDate || null, monthly_rent: rent, notes },
      }),
    onSuccess: () => {
      toast.success(t("rental.lease.renewed"));
      onOpenChange(false);
      onSaved();
    },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rental.lease.renew")}</DialogTitle>
          <DialogDescription>{t("rental.lease.renewHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>{t("rental.lease.newEndDate")}</Label>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
          <div>
            <Label htmlFor="r-rent">{t("rental.lease.rent")}</Label>
            <NumberInput
              id="r-rent"
              min={0}
              step="0.01"
              value={rent}
              emptyFallback={0}
              onChange={(n) => setRent(n ?? 0)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="r-notes">{t("rental.lease.notes")}</Label>
            <Input id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {t("rental.lease.renew")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TerminateDialog({
  open,
  onOpenChange,
  lease,
  onSaved,
  onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lease: LeaseRow;
  onSaved: () => void;
  onError: (e: Error) => void;
}) {
  const { t } = useTranslation();
  const terminate = useServerFn(terminateLease);
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const futureChosen = date > today;

  const m = useMutation({
    mutationFn: () => terminate({ data: { id: lease.id, effective_date: date, reason } }),
    onSuccess: () => {
      toast.success(t("rental.lease.terminated"));
      onOpenChange(false);
      onSaved();
    },
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rental.lease.terminate")}</DialogTitle>
          <DialogDescription>{t("rental.lease.terminateHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>{t("rental.lease.effectiveDate")}</Label>
            <DatePicker value={date} onChange={setDate} />
            {futureChosen && (
              <p className="mt-1 text-xs text-destructive">
                {t("rental.lease.errFutureTermination")}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="t-reason">{t("rental.lease.reason")}</Label>
            <Textarea
              id="t-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => m.mutate()}
            disabled={m.isPending || futureChosen}
          >
            {t("rental.lease.terminate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
