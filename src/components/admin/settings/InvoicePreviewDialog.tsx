import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
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
import type { PropertySettings } from "@/lib/property-settings";
import { buildInvoicePdf, type InvoiceDocData } from "@/lib/invoice-pdf";

function mockInvoiceData(
  values: Partial<PropertySettings>,
  fallbackCompanyName: string,
  fallbackAddress: string,
  currency: string,
  vatRate: number,
  labels: { stayLine: string; extraLine: string; companyName: string },
): InvoiceDocData {
  const isVatInvoice = Boolean(values.companyVatCode?.trim());
  const rate = isVatInvoice ? vatRate || 0 : 0;
  const divisor = 1 + rate / 100;
  const nightGross = 60;
  const nights = 2;
  const extraGross = 16;
  const stayGross = nightGross * nights;
  const stayNet = stayGross / divisor;
  const extraNet = extraGross / divisor;

  const lineItems = [
    {
      name: labels.stayLine,
      qty: nights,
      unit: "naktys",
      unitPriceNet: stayNet / nights,
      lineNet: stayNet,
      lineVat: stayGross - stayNet,
      lineTotal: stayGross,
    },
    {
      name: labels.extraLine,
      qty: 2,
      unit: "vnt.",
      unitPriceNet: extraNet / 2,
      lineNet: extraNet,
      lineVat: extraGross - extraNet,
      lineTotal: extraGross,
    },
  ];
  const subtotalNet = lineItems.reduce((s, l) => s + l.lineNet, 0);
  const vatAmount = lineItems.reduce((s, l) => s + l.lineVat, 0);

  return {
    fullNumber: `${values.invoiceSeries?.trim() || "SF"}-${String(values.invoiceNextNumber || 1).padStart(4, "0")}`,
    issueDate: new Date().toISOString().slice(0, 10),
    isVatInvoice,
    vatRate: rate,
    currency: currency || "EUR",
    seller: {
      name: values.companyName?.trim() || fallbackCompanyName || labels.companyName,
      code: values.companyCode?.trim() || "",
      vatCode: values.companyVatCode?.trim() || "",
      address: values.companyAddress?.trim() || fallbackAddress || "",
      iban: values.iban?.trim() || "",
      bankName: values.bankName?.trim() || "",
      logoUrl: values.invoiceLogoUrl?.trim() || "",
    },
    buyer: {
      name: "Jonas Jonaitis (pavyzdys)",
      code: "",
      vatCode: "",
      address: "Gedimino pr. 1, Vilnius, Lietuva",
      phone: "+370 600 00000",
      email: "jonas.jonaitis@pavyzdys.lt",
    },
    lineItems,
    subtotalNet,
    vatAmount,
    total: subtotalNet + vatAmount,
    notes: values.invoiceNotes?.trim() || "",
    issuedBy: values.invoiceIssuerName?.trim() || "",
  };
}

export function InvoicePreviewDialog({
  values,
  fallbackCompanyName,
  fallbackAddress,
  currency,
  vatRate,
}: {
  values: Partial<PropertySettings>;
  fallbackCompanyName: string;
  fallbackAddress: string;
  currency: string;
  vatRate: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBytes(null);
    const data = mockInvoiceData(values, fallbackCompanyName, fallbackAddress, currency, vatRate, {
      stayLine: t("settings.invoicePreview.sampleStayLine"),
      extraLine: t("settings.invoicePreview.sampleExtraLine"),
      companyName: t("settings.invoicePreview.sampleCompanyName"),
    });
    buildInvoicePdf(data).then((doc) => {
      if (cancelled) return;
      setBytes(new Uint8Array(doc.output("arraybuffer") as ArrayBuffer));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(values), fallbackCompanyName, fallbackAddress, currency, vatRate, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          {t("settings.invoicePreview.open")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.invoicePreview.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.invoicePreview.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <PdfPreview data={bytes} />
        </div>
      </DialogContent>
    </Dialog>
  );
}