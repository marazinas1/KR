import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/bookings/$bookingNumber")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request, params }) => {
        const { withApiAuth, apiJson, apiError } = await import("@/lib/api-auth.server");
        return withApiAuth(
          request,
          "/v1/bookings/:booking_number",
          async ({ headers }) => {
            const url = new URL(request.url);
            const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
            const bookingNumber = (params.bookingNumber ?? "").trim();
            if (!email || !bookingNumber) {
              return apiError("bad_request", "booking_number and email are required", 400, headers);
            }

            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data, error } = await supabaseAdmin
              .from("bookings")
              .select(
                "booking_number, property_id, date_from, date_to, status, payment_status, total_amount, customer_email, extras, extras_total, language",
              )
              .eq("booking_number", bookingNumber)
              .maybeSingle();
            if (error) throw new Error(error.message);
            if (!data || (data.customer_email ?? "").trim().toLowerCase() !== email) {
              return apiError("not_found", "Booking not found", 404, headers);
            }

            // Paslaugų pavadinimai grąžinami prašyta kalba; DB lieka originalai.
            const { loadDefaultLanguage, loadTranslations } = await import(
              "@/lib/translations.server"
            );
            const defaultLang = await loadDefaultLanguage();
            const lang =
              url.searchParams.get("language")?.trim() ||
              (data as { language?: string }).language ||
              defaultLang;

            let extras = (data.extras ?? []) as Array<Record<string, unknown>>;
            if (lang !== defaultLang && Array.isArray(extras) && extras.length > 0) {
              const { extraServiceField } = await import("@/lib/translations");
              const tr = await loadTranslations("property", [data.property_id], lang);
              const map = tr[data.property_id];
              if (map) {
                extras = extras.map((e) => {
                  const t = map[extraServiceField(String(e["name"] ?? ""))];
                  return t?.trim() ? { ...e, name: t } : e;
                });
              }
            }

            return apiJson(
              {
                data: {
                  booking_number: data.booking_number,
                  property_id: data.property_id,
                  date_from: data.date_from,
                  date_to: data.date_to,
                  status: data.status,
                  payment_status: data.payment_status,
                  total_amount: Number(data.total_amount),
                  currency: "EUR",
                  extras,
                  extras_total: Number(data.extras_total ?? 0),
                },
              },
              200,
              headers,
            );
          },
          { rateLimit: 60 },
        );
      },
    },
  },
});