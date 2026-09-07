import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/bookings")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      POST: async ({ request }) => {
        const { withApiAuth, apiJson, apiError } = await import("@/lib/api-auth.server");
        return withApiAuth(
          request,
          "/v1/bookings",
          async ({ headers }) => {
            const { z } = await import("zod");
            const schema = z.object({
              property_id: z.string().uuid(),
              date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              adults: z.number().int().min(1).max(50).default(1),
              children: z.number().int().min(0).max(50).default(0),
              infants: z.number().int().min(0).max(50).default(0),
              extras: z.array(z.object({ name: z.string().trim().min(1).max(100) })).max(20).default([]),
              customer_name: z.string().trim().min(2).max(200),
              customer_email: z.string().trim().email().max(255),
              customer_phone: z.string().trim().min(5).max(50),
              bic: z.string().trim().max(20).optional(),
              is_company: z.boolean().default(false),
              company_name: z.string().trim().max(200).default(""),
              company_code: z.string().trim().max(50).default(""),
              company_vat_code: z.string().trim().max(50).default(""),
              company_address: z.string().trim().max(300).default(""),
              language: z.string().trim().max(5).optional(),
            }).superRefine((d, ctx) => {
              if (d.is_company) {
                if (!d.company_name.trim()) {
                  ctx.addIssue({ code: "custom", path: ["company_name"], message: "Įmonės pavadinimas privalomas" });
                }
                if (!d.company_code.trim()) {
                  ctx.addIssue({ code: "custom", path: ["company_code"], message: "Įmonės kodas privalomas" });
                }
                if (!d.company_address.trim()) {
                  ctx.addIssue({ code: "custom", path: ["company_address"], message: "Įmonės adresas privalomas" });
                }
              }
            });
            let body: unknown;
            try {
              body = await request.json();
            } catch {
              return apiError("bad_request", "Invalid JSON body", 400, headers);
            }
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
              return apiError("bad_request", "Invalid input", 400, headers);
            }
            const d = parsed.data;
            if (d.date_to <= d.date_from) {
              return apiError("bad_request", "date_to must be after date_from", 400, headers);
            }

            const { publicApiClient, occupiedRangesFor, rangesOverlap } = await import(
              "@/lib/api-public.server"
            );
            const supabase = publicApiClient();
            const { data: prop, error } = await supabase
              .from("properties")
              .select("id, price_per_night, price_tiers, extra_services, max_guests, is_active")
              .eq("id", d.property_id)
              .maybeSingle();
            if (error) throw new Error(error.message);
            if (!prop || !prop.is_active) {
              return apiError("not_found", "Property not found", 404, headers);
            }
            const guests = d.adults + d.children;
            if (guests > prop.max_guests) {
              return apiError("too_many_guests", `Max guests: ${prop.max_guests}`, 400, headers);
            }

            const occupied = await occupiedRangesFor(d.property_id);
            if (occupied.some((o) => rangesOverlap(d.date_from, d.date_to, o.date_from, o.date_to))) {
              return apiError("dates_unavailable", "Selected dates are not available", 409, headers);
            }

            const { computeQuote } = await import("@/lib/booking-pricing");
            const { loadDefaultLanguage, loadTranslations, buildExtraNameResolver } = await import(
              "@/lib/translations.server"
            );
            const defaultLang = await loadDefaultLanguage();
            const lang = d.language ?? defaultLang;

            // Išverstus paslaugų pavadinimus paverčiame atgal į originalius —
            // kainos skaičiuojamos pagal properties.extra_services[].name.
            let selectedExtras = d.extras;
            if (lang !== defaultLang) {
              const tr = await loadTranslations("property", [d.property_id], lang);
              const toOriginal = buildExtraNameResolver(tr[d.property_id]);
              selectedExtras = d.extras.map((e) => ({ ...e, name: toOriginal(e.name) }));
            }

            const quote = computeQuote({
              pricePerNight: Number(prop.price_per_night),
              priceTiers: (prop.price_tiers as never) ?? [],
              extraServices: (prop.extra_services as never) ?? [],
              dateFrom: d.date_from,
              dateTo: d.date_to,
              adults: d.adults,
              children: d.children,
              infants: d.infants,
              selectedExtras,
            });

            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const { data: booking, error: bErr } = await supabaseAdmin
              .from("bookings")
              .insert({
                property_id: d.property_id,
                date_from: d.date_from,
                date_to: d.date_to,
                guests,
                adults_count: d.adults,
                children_count: d.children,
                infants_count: d.infants,
                total_guests: guests,
                customer_name: d.customer_name,
                customer_phone: d.customer_phone,
                customer_email: d.customer_email,
                client_type: d.is_company ? "company" : "person",
                company_name: d.company_name,
                company_code: d.company_code,
                customer_address: d.company_address,
                vat_number: d.company_vat_code,
                is_vat_payer: Boolean(d.company_vat_code.trim()),
                source: "website",
                status: "pending",
                total_amount: quote.total,
                payment_amount: quote.total,
                payment_option: "full",
                payment_status: "unpaid",
                payment_provider: "manual_transfer",
                bic: d.bic ?? null,
                expires_at: expiresAt,
                booking_number: "",
                language: lang,
                extras: quote.extras,
                extras_total: quote.extras_total,
              })
              .select("id, booking_number, date_from, date_to, total_amount, status, expires_at")
              .single();
            if (bErr) throw new Error(bErr.message);

            try {
              const { notifyBookingEvent } = await import("@/lib/notifications.server");
              await notifyBookingEvent(String((booking as { id: string }).id), "booking_confirmation");
            } catch (e) {
              console.error("[api:bookings:notify]", e);
            }

            return apiJson(
              {
                data: {
                  booking_number: booking.booking_number,
                  status: booking.status,
                  date_from: booking.date_from,
                  date_to: booking.date_to,
                  total_amount: Number(booking.total_amount),
                  currency: "EUR",
                  expires_at: booking.expires_at,
                  nights: quote.nights,
                  extras: quote.extras,
                },
              },
              201,
              headers,
            );
          },
          { rateLimit: 10 },
        );
      },
    },
  },
});