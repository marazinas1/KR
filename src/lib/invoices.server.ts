// Server-only: sąskaitos generavimas rezervacijai, kai ji tampa apmokėta.
// Generuojama LYGIAI VIENĄ KARTĄ vienai rezervacijai (idempotentiška).

import { rowToSettings } from "./property-settings-map";

const UNIT_LABEL: Record<string, string> = {
  per_person: "asm.",
  per_child: "vaikas",
  flat_per_day: "parą",
};

export async function generateInvoiceForBooking(
  bookingId: string,
): Promise<{ created: boolean; invoiceId?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };

  const { data: existing } = await db
    .from("invoices")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) return { created: false, invoiceId: (existing as { id: string }).id };

  const { data: bookingRow, error: bErr } = await db
    .from("bookings")
    .select("*, properties(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (bErr || !bookingRow) {
    console.error("[generateInvoiceForBooking:booking]", bErr?.message ?? "not found");
    return { created: false };
  }
  const booking = bookingRow as Record<string, any>;

  const { data: settingsRow } = await db
    .from("property_settings")
    .select("*")
    .eq("scope", "global")
    .maybeSingle();
  const settings = rowToSettings(settingsRow as Record<string, unknown> | null);

  const isVatInvoice = Boolean(settings.companyVatCode?.trim());
  const vatRate = isVatInvoice ? Number(settings.vatRate) || 0 : 0;
  const divisor = 1 + vatRate / 100;

  const nights = Math.max(
    0,
    Math.round(
      (new Date(booking.date_to).getTime() - new Date(booking.date_from).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const extrasTotal = Number(booking.extras_total) || 0;
  const stayGross = Math.max(0, Number(booking.total_amount ?? 0) - extrasTotal);
  const propertyName = booking.properties?.name ?? "Apgyvendinimo paslauga";

  const rawLines: Array<{ name: string; qty: number; unit: string; gross: number }> = [];
  if (stayGross > 0 || nights > 0) {
    rawLines.push({
      name: `Nakvynė — ${propertyName}`,
      qty: Math.max(1, nights),
      unit: "naktys",
      gross: stayGross,
    });
  }
  const extras = Array.isArray(booking.extras) ? booking.extras : [];
  for (const ex of extras as Array<{ name: string; calc: string; amount: number }>) {
    if (!ex || Number(ex.amount) <= 0) continue;
    rawLines.push({
      name: ex.name,
      qty: 1,
      unit: UNIT_LABEL[ex.calc] ?? "vnt.",
      gross: Number(ex.amount) || 0,
    });
  }
  if (rawLines.length === 0) {
    rawLines.push({
      name: `Nakvynė — ${propertyName}`,
      qty: 1,
      unit: "paslauga",
      gross: Number(booking.total_amount) || 0,
    });
  }

  const lineItems = rawLines.map((l) => {
    const lineNet = l.gross / divisor;
    const lineVat = l.gross - lineNet;
    return {
      name: l.name,
      qty: l.qty,
      unit: l.unit,
      unitPriceNet: l.qty > 0 ? lineNet / l.qty : 0,
      lineNet,
      lineVat,
      lineTotal: l.gross,
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

  const isCompanyBuyer = booking.client_type === "company";
  const buyerAddressRaw = String(booking.customer_address ?? "");
  const buyer = {
    name: isCompanyBuyer ? String(booking.company_name ?? "") : String(booking.customer_name ?? ""),
    code: isCompanyBuyer ? String(booking.company_code ?? "") : String(booking.customer_id_code ?? ""),
    vatCode: isCompanyBuyer && booking.is_vat_payer ? String(booking.vat_number ?? "") : "",
    address: [buyerAddressRaw, booking.customer_country].filter(Boolean).join(", "),
    phone: String(booking.customer_phone ?? ""),
    email: String(booking.customer_email ?? ""),
  };

  const { data: numberRows, error: numberError } = await db.rpc("claim_invoice_number");
  if (numberError || !numberRows?.[0]) {
    console.error("[generateInvoiceForBooking:claim_invoice_number]", numberError?.message);
    return { created: false };
  }
  const { series, number } = numberRows[0] as { series: string; number: number };
  const fullNumber = series ? `${series}-${number}` : String(number);

  const { data: inv, error } = await db
    .from("invoices")
    .insert({
      booking_id: bookingId,
      invoice_series: series ?? "",
      invoice_number: number,
      full_number: fullNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      currency: settings.currency || "EUR",
      vat_rate: vatRate,
      is_vat_invoice: isVatInvoice,
      seller,
      buyer,
      line_items: lineItems,
      subtotal_net: subtotalNet,
      vat_amount: vatAmount,
      total,
      notes: settings.invoiceNotes || "",
      issued_by: settings.invoiceIssuerName || "",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[generateInvoiceForBooking:insert]", error.message);
    return { created: false };
  }
  return { created: true, invoiceId: (inv as { id: string }).id };
}