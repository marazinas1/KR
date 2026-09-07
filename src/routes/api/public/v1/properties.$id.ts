import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/properties/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request, params }) => {
        const { withApiAuth, apiJson, apiError } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/properties/:id", async ({ headers }) => {
          const { z } = await import("zod");
          const parsed = z.string().uuid().safeParse(params.id);
          if (!parsed.success) {
            return apiError("bad_request", "Invalid property id", 400, headers);
          }
          const { publicApiClient, publicProperty, PROPERTY_PUBLIC_COLUMNS, occupiedRangesFor } =
            await import("@/lib/api-public.server");
          const { loadDefaultLanguage, loadTranslations, applyPropertyTranslations } = await import(
            "@/lib/translations.server"
          );
          const supabase = publicApiClient();
          const { data, error } = await supabase
            .from("properties")
            .select(PROPERTY_PUBLIC_COLUMNS)
            .eq("id", parsed.data)
            .eq("is_active", true)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!data) return apiError("not_found", "Property not found", 404, headers);

          const base = publicProperty(data as never);
          const defaultLang = await loadDefaultLanguage();
          const lang = new URL(request.url).searchParams.get("language") ?? defaultLang;

          let translated = base;
          if (lang !== defaultLang) {
            const tr = await loadTranslations("property", [base.id], lang);
            translated = applyPropertyTranslations(base, tr[base.id]);
          }

          const occupied = await occupiedRangesFor(parsed.data);
          return apiJson({ data: { ...translated, occupied } }, 200, headers);
        });
      },
    },
  },
});