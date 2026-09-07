import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/legal")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withApiAuth, apiJson, apiError } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/legal", async ({ headers }) => {
          const { z } = await import("zod");
          const url = new URL(request.url);
          const schema = z.object({
            kind: z.enum(["rental", "privacy"]),
            language: z.enum(["lt", "en"]).default("lt"),
          });
          const parsed = schema.safeParse({
            kind: url.searchParams.get("kind") ?? undefined,
            language: url.searchParams.get("language") ?? undefined,
          });
          if (!parsed.success) {
            return apiError("bad_request", "Invalid query parameters", 400, headers);
          }

          // Kvietėjas jau patvirtintas API raktu; contract_templates neturi anon
          // skaitymo politikos, tad skaitome per privilegijuotą klientą.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: row, error } = await supabaseAdmin
            .from("contract_templates")
            .select("id, name, content, language, kind, updated_at")
            .eq("language", parsed.data.language)
            .eq("kind", parsed.data.kind)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("[api:/v1/legal]", error.message);
            return apiError("server_error", "Request failed", 500, headers);
          }
          if (!row) {
            return apiError("not_found", "Active template not found", 404, headers);
          }

          return apiJson(
            {
              data: {
                kind: row.kind,
                language: row.language,
                name: row.name,
                content: row.content,
                updated_at: row.updated_at,
              },
            },
            200,
            headers,
          );
        });
      },
    },
  },
});