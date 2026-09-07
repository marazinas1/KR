import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { listAllProperties } from "@/lib/properties.functions";
import { getBooking, updateBooking } from "@/lib/bookings.functions";
import { getInvoiceForBooking, ensureInvoiceForBooking } from "@/lib/invoices.functions";
import { InvoiceViewerDialog, type InvoiceRow } from "@/components/admin/InvoiceViewerDialog";
import { Button } from "@/components/ui/button";
import {
  BookingForm,
  defaultBookingForm,
  type BookingFormValues,
} from "@/components/admin/BookingForm";

export const Route = createFileRoute("/_authenticated/admin/bookings/$id")({
  component: EditBookingPage,
});

function EditBookingPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/_authenticated/admin/bookings/$id" });
  const fetchOne = useServerFn(getBooking);
  const fetchProps = useServerFn(listAllProperties);
  const update = useServerFn(updateBooking);
  const fetchInvoice = useServerFn(getInvoiceForBooking);
  const ensureInvoice = useServerFn(ensureInvoiceForBooking);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const { data: booking, isLoading } = useQuery({
    queryKey: ["admin-booking", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const { data: invoice } = useQuery({
    queryKey: ["admin-invoice", id],
    queryFn: () => fetchInvoice({ data: { bookingId: id } }),
    enabled: Boolean(booking),
  });

  const generateInvoice = useMutation({
    mutationFn: () => ensureInvoice({ data: { bookingId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invoice", id] });
      toast.success(t("bookings.detail.invoiceGenerated"));
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("bookings.detail.invoiceError")),
  });

  const m = useMutation({
    mutationFn: (v: BookingFormValues) => update({ data: { id, ...v } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
        qc.invalidateQueries({ queryKey: ["admin-booking", id] }),
        qc.invalidateQueries({ queryKey: ["admin-invoice", id] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);
      navigate({ to: "/admin/bookings" });
    },
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (!booking) return <p>{t("common.notFound")}</p>;

  const initial: BookingFormValues = {
    ...defaultBookingForm(props),
    property_id: booking.property_id,
    date_from: booking.date_from,
    date_to: booking.date_to,
    check_in_time: booking.check_in_time ?? "",
    check_out_time: booking.check_out_time ?? "",
    location: booking.location ?? "",
    guests: booking.guests ?? 1,
    adults_count: booking.adults_count ?? Math.max(1, (booking.guests ?? 1) - (booking.children_count ?? 0)),
    children_count: booking.children_count ?? 0,
    infants_count: booking.infants_count ?? 0,
    total_guests: booking.total_guests ?? booking.guests ?? 1,
    customer_name: booking.customer_name ?? "",
    customer_phone: booking.customer_phone ?? "",
    customer_email: booking.customer_email ?? "",
    customer_address: booking.customer_address ?? "",
    customer_country: (booking as any).customer_country ?? "Lietuva",
    customer_id_code: booking.customer_id_code ?? "",
    client_type: (booking.client_type ?? "person") as BookingFormValues["client_type"],
    birth_date: booking.birth_date ?? null,
    company_name: booking.company_name ?? "",
    company_code: booking.company_code ?? "",
    is_vat_payer: Boolean(booking.is_vat_payer),
    vat_number: booking.vat_number ?? "",
    source: (booking.source ?? "phone") as BookingFormValues["source"],
    status: (booking.status ?? "confirmed") as BookingFormValues["status"],
    total_amount: Number(booking.total_amount ?? 0),
    note: booking.note ?? "",
    extras: Array.isArray(booking.extras)
      ? (booking.extras as BookingFormValues["extras"])
      : [],
    extras_total: Number(booking.extras_total ?? 0),
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {t("bookings.detail.title", { number: booking.booking_number })}
      </h1>
      <div className="mb-4">
        {invoice ? (
          <InvoiceViewerDialog invoice={invoice as unknown as InvoiceRow} />
        ) : booking.status === "confirmed" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => generateInvoice.mutate()}
            disabled={generateInvoice.isPending}
          >
            {generateInvoice.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Receipt className="mr-2 h-4 w-4" />
            )}
            {t("bookings.detail.generateInvoice")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("bookings.detail.invoiceAuto")}
          </p>
        )}
      </div>
      <BookingForm
        properties={props}
        initial={initial}
        bookingId={id}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
      />
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}