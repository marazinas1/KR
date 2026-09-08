import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  convertInquiry,
  listInquiries,
  setInquiryStatus,
  type InquiryRow,
} from "@/lib/inquiries.functions";
import { listUnits } from "@/lib/units.functions";
import { listTenants } from "@/lib/tenants.functions";
import { INQUIRY_STATUSES, todayIso, type InquiryStatus } from "@/lib/rental";

type InquiryFilter = "open" | "all" | InquiryStatus;

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: InquiriesPage,
  validateSearch: (s: Record<string, unknown>): { status?: InquiryFilter } =>
    s["status"] === "all" || INQUIRY_STATUSES.includes(s["status"] as never)
      ? { status: s["status"] as InquiryFilter }
      : {},
});

function InquiriesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const fetchInquiries = useServerFn(listInquiries);
  const changeStatus = useServerFn(setInquiryStatus);
  const fetchUnits = useServerFn(listUnits);
  const fetchTenants = useServerFn(listTenants);

  const { status: statusParam } = Route.useSearch();
  const filter: InquiryFilter = statusParam ?? "open";
  const setFilter = (f: InquiryFilter) =>
    navigate({ search: f === "open" ? {} : { status: f }, replace: true });
  const [converting, setConverting] = useState<InquiryRow | null>(null);

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: () => fetchInquiries(),
  });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits({}) });
  const { data: tenants = [] } = useQuery({ queryKey: ["tenants"], queryFn: () => fetchTenants() });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: InquiryStatus }) => changeStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      toast.success(t("rental.inquiries.statusSaved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    if (filter === "all") return inquiries;
    if (filter === "open")
      return inquiries.filter((i) => i.status !== "converted" && i.status !== "dismissed");
    return inquiries.filter((i) => i.status === filter);
  }, [inquiries, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("rental.inquiries.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("rental.inquiries.lead")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "open" ? "default" : "outline"}
            onClick={() => setFilter("open")}
          >
            {t("rental.inquiries.filterOpen")}
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            {t("rental.inquiries.filterAll")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">{t("rental.inquiries.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("rental.inquiries.received")}</th>
                <th className="px-4 py-3">{t("rental.inquiries.person")}</th>
                <th className="px-4 py-3">{t("rental.inquiries.unit")}</th>
                <th className="px-4 py-3">{t("rental.inquiries.moveIn")}</th>
                <th className="px-4 py-3">{t("rental.inquiries.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {i.created_at.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[i.phone, i.email].filter(Boolean).join(" · ")}
                    </div>
                    {i.message ? (
                      <p className="mt-1 max-w-md whitespace-pre-line text-xs text-muted-foreground">
                        {i.message}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{i.unit_name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{i.move_in_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={i.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({ id: i.id, status: v as InquiryStatus })
                      }
                      disabled={i.status === "converted"}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INQUIRY_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`rental.inquiries.state.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.status === "converted" ? (
                      <span className="text-xs text-muted-foreground">
                        {t("rental.inquiries.alreadyConverted")}
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConverting(i)}>
                        {t("rental.inquiries.convert")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {converting ? (
        <ConvertDialog
          inquiry={converting}
          units={units}
          tenants={tenants}
          onClose={() => setConverting(null)}
          onDone={() => {
            setConverting(null);
            qc.invalidateQueries({ queryKey: ["inquiries"] });
            qc.invalidateQueries({ queryKey: ["units"] });
            qc.invalidateQueries({ queryKey: ["tenants"] });
          }}
        />
      ) : null}
    </div>
  );
}

function ConvertDialog({
  inquiry,
  units,
  tenants,
  onClose,
  onDone,
}: {
  inquiry: InquiryRow;
  units: Array<{ id: string; name: string; monthly_rent: number; deposit: number }>;
  tenants: Array<{ id: string; first_name: string; last_name: string }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const convert = useServerFn(convertInquiry);

  const parts = inquiry.name.trim().split(/\s+/);
  const [unitId, setUnitId] = useState(inquiry.unit_id ?? "");
  const [tenantId, setTenantId] = useState("");
  const [firstName, setFirstName] = useState(parts[0] ?? "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" "));
  const [startDate, setStartDate] = useState(inquiry.move_in_date ?? todayIso());
  const [endDate, setEndDate] = useState("");
  const unit = units.find((u) => u.id === unitId);
  const [rent, setRent] = useState(String(unit?.monthly_rent ?? 0));
  const [deposit, setDeposit] = useState(String(unit?.deposit ?? 0));
  const [paymentDay, setPaymentDay] = useState("1");
  const [noticeDays, setNoticeDays] = useState("30");
  const [notes, setNotes] = useState(inquiry.message);

  const mutation = useMutation({
    mutationFn: () =>
      convert({
        data: {
          inquiry_id: inquiry.id,
          unit_id: unitId,
          tenant_id: tenantId || null,
          first_name: firstName,
          last_name: lastName,
          phone: inquiry.phone,
          email: inquiry.email,
          start_date: startDate,
          end_date: endDate || null,
          monthly_rent: Number(rent) || 0,
          deposit: Number(deposit) || 0,
          payment_day: Number(paymentDay) || 1,
          notice_days: Number(noticeDays) || 30,
          notes,
        },
      }),
    onSuccess: () => {
      toast.success(t("rental.inquiries.converted"));
      onDone();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("LeaseOverlap")
          ? t("rental.inquiries.overlap")
          : e.message,
      ),
  });

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("rental.inquiries.convertTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("rental.inquiries.unit")}</Label>
            <Select
              value={unitId}
              onValueChange={(v) => {
                setUnitId(v);
                const u = units.find((x) => x.id === v);
                if (u) {
                  setRent(String(u.monthly_rent));
                  setDeposit(String(u.deposit));
                }
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("rental.inquiries.pickUnit")} />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("rental.inquiries.tenant")}</Label>
            <Select value={tenantId || "new"} onValueChange={(v) => setTenantId(v === "new" ? "" : v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("rental.inquiries.newTenant")}</SelectItem>
                {tenants.map((tn) => (
                  <SelectItem key={tn.id} value={tn.id}>
                    {`${tn.first_name} ${tn.last_name}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("rental.inquiries.transactionNote")}
            </p>
          </div>

          {!tenantId ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("rental.tenants.fFirstName")}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>{t("rental.tenants.fLastName")}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("rental.lease.startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("rental.lease.endDate")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("rental.lease.rent")}</Label>
              <Input type="number" min={0} value={rent} onChange={(e) => setRent(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("rental.lease.deposit")}</Label>
              <Input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("rental.lease.paymentDay")}</Label>
              <Input type="number" min={1} max={28} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("rental.lease.notice")}</Label>
              <Input type="number" min={0} value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>{t("rental.lease.notes")}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!unitId || !startDate || mutation.isPending} onClick={() => mutation.mutate()}>
            {t("rental.inquiries.createDraft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
