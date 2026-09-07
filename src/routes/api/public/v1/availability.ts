import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/availability")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withApiAuth, apiJson, apiError } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/availability", async ({ headers }) => {
          const { z } = await import("zod");
          const url = new URL(request.url);
          const schema = z.object({
            property_id: z.string().uuid(),
            from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          });
          const parsed = schema.safeParse({
            property_id: url.searchParams.get("property_id") ?? "",
            from: url.searchParams.get("from") ?? undefined,
            to: url.searchParams.get("to") ?? undefined,
          });
          if (!parsed.success) {
            return apiError("bad_request", "Invalid query parameters", 400, headers);
          }
          const { occupiedRangesFor, rangesOverlap } = await import("@/lib/api-public.server");
          const occupied = await occupiedRangesFor(parsed.data.property_id);
          const { from, to } = parsed.data;
          const inWindow =
            from && to ? occupied.filter((o) => rangesOverlap(from, to, o.date_from, o.date_to)) : occupied;
          return apiJson(
            {
              data: {
                property_id: parsed.data.property_id,
                occupied: inWindow,
                available: from && to ? inWindow.length === 0 : null,
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