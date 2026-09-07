import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye } from "lucide-react";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { PdfPreview } from "@/components/admin/PdfPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildInvoicePdf,
  type InvoiceDocData,
  type InvoiceLineItem,
  type InvoicePartyData,
} from "@/lib/invoice-pdf";

export type InvoiceRow = {
  full_number: string;
  issue_date: string;
  is_vat_invoice: boolean;
  vat_rate: number;
  currency: string;
  seller: InvoicePartyData;
  buyer: InvoicePartyData;
  line_items: InvoiceLineItem[];
  subtotal_net: number;
  vat_amount: number;
  total: number;
  notes: string;
  issued_by: string;
};

function toDocData(row: InvoiceRow): InvoiceDocData {
  return {
    fullNumber: row.full_number,
    issueDate: row.issue_date,
    isVatInvoice: row.is_vat_invoice,
    vatRate: Number(row.vat_rate) || 0,
    currency: row.currency || "EUR",
    seller: row.seller,
    buyer: row.buyer,
    lineItems: row.line_items,
    subtotalNet: Number(row.subtotal_net) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    total: Number(row.total) || 0,
    notes: row.notes || "",
    issuedBy: row.issued_by || "",
  };
}

export function InvoiceViewerDialog({ invoice }: { invoice: InvoiceRow }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBytes(null);
    buildInvoicePdf(toDocData(invoice)).then((doc) => {
      if (cancelled) return;
      setPdfDoc(doc);
      setBytes(new Uint8Array(doc.output("arraybuffer") as ArrayBuffer));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          {t("bookings.invoice.viewNumbered", { number: invoice.full_number })}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("bookings.invoice.titleNumbered", { number: invoice.full_number })}
          </DialogTitle>
          <DialogDescription>{t("bookings.invoice.issuedOn", { date: invoice.issue_date })}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <PdfPreview data={bytes} />
        </div>
        <Button
          type="button"
          disabled={!pdfDoc}
          onClick={() => pdfDoc?.save(`saskaita-${invoice.full_number}.pdf`)}
          className="mt-2 w-fit"
        >
          <Download className="mr-2 h-4 w-4" />
          {t("common.downloadPdf")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}