import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/quote")({
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
          "/v1/quote",
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
              language: z.string().trim().max(5).optional(),
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

            const { publicApiClient } = await import("@/lib/api-public.server");
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
            if (d.adults + d.children > prop.max_guests) {
              return apiError("too_many_guests", `Max guests: ${prop.max_guests}`, 400, headers);
            }

            const { computeQuote } = await import("@/lib/booking-pricing");
            const { loadDefaultLanguage, loadTranslations, buildExtraNameResolver } = await import(
              "@/lib/translations.server"
            );
            const defaultLang = await loadDefaultLanguage();
            const lang = d.language ?? defaultLang;

            // Kai naršoma ne originalo kalba, klientas atsiunčia IŠVERSTUS paslaugų
            // pavadinimus. Juos būtina paversti atgal į originalius, nes kainos
            // skaičiuojamos lyginant su properties.extra_services[].name.
            let selectedExtras = d.extras;
            let extraTr: Record<string, string> | undefined;
            if (lang !== defaultLang) {
              const tr = await loadTranslations("property", [d.property_id], lang);
              extraTr = tr[d.property_id];
              const toOriginal = buildExtraNameResolver(extraTr);
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

            const { occupiedRangesFor, rangesOverlap } = await import("@/lib/api-public.server");
            const occupied = await occupiedRangesFor(d.property_id);
            const available = !occupied.some((o) =>
              rangesOverlap(d.date_from, d.date_to, o.date_from, o.date_to),
            );

            const { extraServiceField } = await import("@/lib/translations");
            const quoteOut = extraTr
              ? {
                  ...quote,
                  extras: quote.extras.map((e) => {
                    const t = extraTr![extraServiceField(e.name)];
                    return t?.trim() ? { ...e, name: t } : e;
                  }),
                }
              : quote;

            return apiJson({ data: { ...quoteOut, currency: "EUR", available } }, 200, headers);
          },
          { rateLimit: 120 },
        );
      },
    },
  },
});