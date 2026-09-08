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
            return apiError("bad_request", "Invalid unit id", 400, headers);
          }
          const { publicApiClient, publicUnit, UNIT_PUBLIC_COLUMNS } = await import(
            "@/lib/api-public.server"
          );
          const { loadDefaultLanguage, loadTranslations, applyPropertyTranslations } = await import(
            "@/lib/translations.server"
          );
          const supabase = publicApiClient();
          const { data, error } = await supabase
            .from("public_vacancies")
            .select(UNIT_PUBLIC_COLUMNS)
            .eq("id", parsed.data)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!data) return apiError("not_found", "Unit not found", 404, headers);

          const base = publicUnit(data as never);
          const defaultLang = await loadDefaultLanguage();
          const lang = new URL(request.url).searchParams.get("language") ?? defaultLang;

          let translated = base;
          if (lang !== defaultLang) {
            const tr = await loadTranslations("property", [base.id], lang);
            translated = applyPropertyTranslations(base, tr[base.id]);
          }

          return apiJson({ data: translated }, 200, headers);
        });
      },
    },
  },
});
