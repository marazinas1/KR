import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/properties")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withApiAuth, apiJson } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/properties", async ({ headers }) => {
          const { publicApiClient, publicProperty, PROPERTY_PUBLIC_COLUMNS } = await import(
            "@/lib/api-public.server"
          );
          const { loadDefaultLanguage, loadTranslations, applyPropertyTranslations } = await import(
            "@/lib/translations.server"
          );
          const supabase = publicApiClient();
          const { data, error } = await supabase
            .from("properties")
            .select(PROPERTY_PUBLIC_COLUMNS)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
          if (error) throw new Error(error.message);

          const rows = (data ?? []).map((r) => publicProperty(r as never));

          const defaultLang = await loadDefaultLanguage();
          const lang = new URL(request.url).searchParams.get("language") ?? defaultLang;

          // Prašoma originalo kalba — versti nėra ko.
          if (lang === defaultLang) {
            return apiJson({ data: rows }, 200, headers);
          }

          const tr = await loadTranslations(
            "property",
            rows.map((r) => r.id),
            lang,
          );
          return apiJson(
            { data: rows.map((r) => applyPropertyTranslations(r, tr[r.id])) },
            200,
            headers,
          );
        });
      },
    },
  },
});