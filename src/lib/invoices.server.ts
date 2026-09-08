// Server-only: sąskaitos įrašo sukūrimas.
// Numeravimo serija imama atomiškai per claim_invoice_number(); pardavėjo
// rekvizitai — iš org_settings (white-label). Sąskaita nebesusieta su
// trumpalaikėmis rezervacijomis; lease_id yra neprivalomas.

import { rowToSettings } from "./property-settings-map";

export type InvoiceBuyerInput = {
  name: string;
  code?: string;
  vatCode?: string;
  address?: string;
  phone?: string;
  email?: string;
};

/** Eilutė su BRUTO suma (su PVM), kaip įvedama admin formoje. */
export type InvoiceLineInput = {
  name: string;
  qty: number;
  unit: string;
  gross: number;
};

export type CreateInvoiceInput = {
  buyer: InvoiceBuyerInput;
  lineItems: InvoiceLineInput[];
  leaseId?: string | null;
  issueDate?: string;
  notes?: string;
};

export async function createInvoiceRecord(
  input: CreateInvoiceInput,
): Promise<{ id: string; full_number: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };

  const { data: settingsRow } = await db.from("org_settings").select("*").maybeSingle();
  const settings = rowToSettings(settingsRow as Record<string, unknown> | null);

  const isVatInvoice = Boolean(settings.companyVatCode?.trim());
  const vatRate = isVatInvoice ? Number(settings.vatRate) || 0 : 0;
  const divisor = 1 + vatRate / 100;

  const lines = input.lineItems.filter((l) => l.name.trim() && Number(l.gross) > 0);
  if (lines.length === 0) throw new Error("Sąskaitoje turi būti bent viena eilutė.");

  const lineItems = lines.map((l) => {
    const qty = Number(l.qty) > 0 ? Number(l.qty) : 1;
    const gross = Number(l.gross) || 0;
    const lineNet = gross / divisor;
    return {
      name: l.name,
      qty,
      unit: l.unit || "vnt.",
      unitPriceNet: lineNet / qty,
      lineNet,
      lineVat: gross - lineNet,
      lineTotal: gross,
    };
  });

  const subtotalNet = lineItems.reduce((s, l) => s + l.lineNet, 0);
  const vatAmount = lineItems.reduce((s, l) => s + l.lineVat, 0);
  const total = subtotalNet + vatAmount;

  const seller = {
    name: settings.companyName?.trim() || settings.displayName?.trim() || "",
    code: settings.companyCode?.trim() || "",
    vatCode: settings.companyVatCode?.trim() || "",
    address: settings.companyAddress?.trim() || settings.address?.trim() || "",
    iban: settings.iban?.trim() || "",
    bankName: settings.bankName?.trim() || "",
    logoUrl: settings.invoiceLogoUrl?.trim() || "",
  };

  const buyer = {
    name: input.buyer.name?.trim() || "",
    code: input.buyer.code?.trim() || "",
    vatCode: input.buyer.vatCode?.trim() || "",
    address: input.buyer.address?.trim() || "",
    phone: input.buyer.phone?.trim() || "",
    email: input.buyer.email?.trim() || "",
  };

  const { data: numberRows, error: numberError } = await db.rpc("claim_invoice_number");
  if (numberError || !numberRows?.[0]) {
    console.error("[createInvoiceRecord:claim_invoice_number]", numberError?.message);
    throw new Error("Nepavyko priskirti sąskaitos numerio.");
  }
  const { series, number } = numberRows[0] as { series: string; number: number };
  const fullNumber = series ? `${series}-${number}` : String(number);

  const { data: inv, error } = await db
    .from("invoices")
    .insert({
      lease_id: input.leaseId ?? null,
      invoice_series: series ?? "",
      invoice_number: number,
      full_number: fullNumber,
      issue_date: input.issueDate || new Date().toISOString().slice(0, 10),
      currency: settings.currency || "EUR",
      vat_rate: vatRate,
      is_vat_invoice: isVatInvoice,
      seller,
      buyer,
      line_items: lineItems,
      subtotal_net: subtotalNet,
      vat_amount: vatAmount,
      total,
      notes: (input.notes ?? settings.invoiceNotes) || "",
      issued_by: settings.invoiceIssuerName || "",
    })
    .select("id, full_number")
    .single();

  if (error) {
    console.error("[createInvoiceRecord:insert]", error.message);
    throw new Error(error.message);
  }
  return inv as { id: string; full_number: string };
}
