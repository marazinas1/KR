import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { NumberInput } from "@/components/NumberInput";
import { createInvoice, listInvoices } from "@/lib/invoices.functions";
import { InvoiceViewerDialog, type InvoiceRow } from "@/components/admin/InvoiceViewerDialog";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: InvoicesPage,
  head: () => ({
    meta: [
      { title: "Sąskaitos — nuomos administravimas" },
      {
        name: "description",
        content: "Išrašytų nuomos sąskaitų sąrašas, numeracija ir PDF peržiūra.",
      },
    ],
  }),
});

type LineDraft = { name: string; qty: number; unit: string; gross: number };

const emptyLine = (): LineDraft => ({ name: "", qty: 1, unit: "vnt.", gross: 0 });

function InvoicesPage() {
  const { t } = useTranslation();
  const fetchInvoices = useServerFn(listInvoices);
  const create = useServerFn(createInvoice);

  const { data: invoices = [], refetch } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => fetchInvoices(),
  });

  const [open, setOpen] = useState(false);
  const [buyer, setBuyer] = useState({ name: "", code: "", vatCode: "", address: "", phone: "", email: "" });
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          buyer,
          issueDate,
          notes,
          lineItems: lines
            .filter((l) => l.name.trim())
            .map((l) => ({ name: l.name.trim(), qty: l.qty || 1, unit: l.unit || "vnt.", gross: l.gross })),
        },
      }),
    onSuccess: (res: { full_number: string }) => {
      toast.success(t("invoices.created", { number: res.full_number }));
      setBuyer({ name: "", code: "", vatCode: "", address: "", phone: "", email: "" });
      setLines([emptyLine()]);
      setNotes("");
      setOpen(false);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = lines.reduce((s, l) => s + (Number(l.gross) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("invoices.title")}</h1>
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("invoices.new")}
        </Button>
      </div>

      {open && (
        <form
          className="space-y-5 rounded-lg border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!buyer.name.trim()) return toast.error(t("invoices.buyerNameRequired"));
            if (!lines.some((l) => l.name.trim() && l.gross > 0))
              return toast.error(t("invoices.lineRequired"));
            m.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("invoices.buyerName")}</Label>
              <Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.issueDate")}</Label>
              <DatePicker value={issueDate} onChange={(v) => setIssueDate(v || issueDate)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.buyerCode")}</Label>
              <Input value={buyer.code} onChange={(e) => setBuyer({ ...buyer, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.buyerVatCode")}</Label>
              <Input value={buyer.vatCode} onChange={(e) => setBuyer({ ...buyer, vatCode: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("invoices.buyerAddress")}</Label>
              <Input value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.buyerPhone")}</Label>
              <Input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("invoices.buyerEmail")}</Label>
              <Input value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t("invoices.lines")}</Label>
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_5rem_7rem_2.5rem]">
                <Input
                  placeholder={t("invoices.lineName")}
                  value={l.name}
                  onChange={(e) =>
                    setLines(lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <NumberInput
                  value={l.qty}
                  onChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: v ?? 1 } : x)))}
                />
                <Input
                  value={l.unit}
                  onChange={(e) =>
                    setLines(lines.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))
                  }
                />
                <NumberInput
                  value={l.gross}
                  onChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, gross: v ?? 0 } : x)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              {t("invoices.addLine")}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{t("invoices.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("invoices.total")}: <span className="font-medium text-foreground">{total.toFixed(2)}</span>
            </p>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? t("common.loading") : t("invoices.create")}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">{t("invoices.number")}</th>
              <th className="p-3 font-medium">{t("invoices.issueDate")}</th>
              <th className="p-3 font-medium">{t("invoices.buyerName")}</th>
              <th className="p-3 text-right font-medium">{t("invoices.total")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(invoices as unknown as InvoiceRow[]).length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("invoices.empty")}
                </td>
              </tr>
            )}
            {(invoices as unknown as InvoiceRow[]).map((inv) => (
              <tr key={inv.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{inv.full_number}</td>
                <td className="p-3">{inv.issue_date}</td>
                <td className="p-3">{inv.buyer?.name ?? ""}</td>
                <td className="p-3 text-right">
                  {Number(inv.total).toFixed(2)} {inv.currency}
                </td>
                <td className="p-3 text-right">
                  <InvoiceViewerDialog invoice={inv} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
