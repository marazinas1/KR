import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/payment-details")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withApiAuth, apiJson } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/payment-details", async ({ headers }) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("property_settings")
            .select("iban, bank_name, company_name")
            .eq("scope", "global")
            .maybeSingle();
          if (error) throw new Error(error.message);
          return apiJson(
            {
              data: {
                iban: data?.iban ?? "",
                bank_name: data?.bank_name ?? "",
                beneficiary_name: data?.company_name ?? "",
                currency: "EUR",
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
