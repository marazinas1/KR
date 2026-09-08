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

type Settings = ReturnType<typeof rowToSettings>;

/** Shared net/VAT/seller/buyer derivation — used by both invoice paths. */
function buildInvoiceBody(settings: Settings, buyerIn: InvoiceBuyerInput, lineIn: InvoiceLineInput[]) {
  const isVatInvoice = Boolean(settings.companyVatCode?.trim());
  const vatRate = isVatInvoice ? Number(settings.vatRate) || 0 : 0;
  const divisor = 1 + vatRate / 100;

  const lines = lineIn.filter((l) => l.name.trim() && Number(l.gross) > 0);
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

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const total = r2(lineItems.reduce((s, l) => s + l.lineTotal, 0));
  const subtotalNet = r2(lineItems.reduce((s, l) => s + l.lineNet, 0));
  const vatAmount = r2(total - subtotalNet);

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
    name: buyerIn.name?.trim() || "",
    code: buyerIn.code?.trim() || "",
    vatCode: buyerIn.vatCode?.trim() || "",
    address: buyerIn.address?.trim() || "",
    phone: buyerIn.phone?.trim() || "",
    email: buyerIn.email?.trim() || "",
  };

  return { isVatInvoice, vatRate, lineItems, subtotalNet, vatAmount, total, seller, buyer };
}

async function loadSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settingsRow } = await (supabaseAdmin as any).from("org_settings").select("*").maybeSingle();
  return rowToSettings(settingsRow as Record<string, unknown> | null);
}

export async function createInvoiceRecord(
  input: CreateInvoiceInput,
): Promise<{ id: string; full_number: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };

  const settings = await loadSettings();
  const body = buildInvoiceBody(settings, input.buyer, input.lineItems);

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
      vat_rate: body.vatRate,
      is_vat_invoice: body.isVatInvoice,
      seller: body.seller,
      buyer: body.buyer,
      line_items: body.lineItems,
      subtotal_net: body.subtotalNet,
      vat_amount: body.vatAmount,
      total: body.total,
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

const KIND_ORDER: Record<string, number> = { rent: 0, utility: 1, fixed: 2, one_off: 3, penalty: 4 };

/**
 * Invoice from charges. The app only computes the body (lines, totals, buyer);
 * the number claim, the invoice INSERT and stamping `charges.invoice_id` all
 * happen inside ONE database transaction (`issue_invoice_for_charges`), which
 * rolls back entirely on any failure. Runs as the signed-in manager (the
 * function checks is_manager(auth.uid()) itself).
 */
export async function issueInvoiceForCharges(
  userClient: unknown,
  input: { chargeIds: string[]; issueDate?: string; notes?: string },
): Promise<{ id: string; full_number: string }> {
  const userDb = userClient as {
    from: (t: string) => any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };
  const { data: charges, error: cErr } = await userDb
    .from("charges")
    .select("id, lease_id, kind, description, quantity, amount, invoice_id, period")
    .in("id", input.chargeIds);
  if (cErr) throw new Error(cErr.message);
  if (!charges || charges.length !== input.chargeIds.length) throw new Error("ChargeNotFound");
  const leaseIds = new Set(charges.map((c: any) => c.lease_id));
  if (leaseIds.size !== 1) throw new Error("ChargesSpanLeases");
  if (charges.some((c: any) => c.invoice_id)) throw new Error("ChargeAlreadyInvoiced");
  const leaseId = charges[0].lease_id as string;

  const { data: lease, error: lErr } = await userDb
    .from("leases")
    .select("id, tenant_id, tenants:tenant_id (first_name, last_name, phone, email)")
    .eq("id", leaseId)
    .maybeSingle();
  if (lErr) throw new Error(lErr.message);
  const tn = (lease as any)?.tenants ?? {};

  const settings = await loadSettings();
  const sorted = [...charges].sort(
    (a: any, b: any) =>
      (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
      String(a.description).localeCompare(String(b.description)),
  );
  const body = buildInvoiceBody(
    settings,
    {
      name: `${tn.first_name ?? ""} ${tn.last_name ?? ""}`.trim(),
      phone: tn.phone ?? "",
      email: tn.email ?? "",
    },
    sorted.map((c: any) => ({
      name: c.description || c.kind,
      qty: Number(c.quantity) > 0 ? Number(c.quantity) : 1,
      unit: c.kind === "utility" ? "vnt." : "mėn.",
      gross: Number(c.amount),
    })),
  );

  const { data, error } = await userDb.rpc("issue_invoice_for_charges", {
    _charge_ids: sorted.map((c: any) => c.id),
    _issue_date: input.issueDate || new Date().toISOString().slice(0, 10),
    _currency: settings.currency || "EUR",
    _vat_rate: body.vatRate,
    _is_vat_invoice: body.isVatInvoice,
    _seller: body.seller,
    _buyer: body.buyer,
    _line_items: body.lineItems,
    _subtotal_net: body.subtotalNet,
    _vat_amount: body.vatAmount,
    _total: body.total,
    _notes: (input.notes ?? settings.invoiceNotes) || "",
    _issued_by: settings.invoiceIssuerName || "",
  });
  if (error) {
    if (error.message.includes("ChargeAlreadyInvoiced")) throw new Error("ChargeAlreadyInvoiced");
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.invoice_id as string, full_number: row.full_number as string };
}
