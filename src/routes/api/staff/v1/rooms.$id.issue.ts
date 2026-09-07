import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/issue")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      POST: async ({ request, params }) => {
        const { withStaffAuth, apiJson, apiError } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ headers, userId }) => {
          const { z } = await import("zod");
          const schema = z.object({
            has_issue: z.boolean(),
            issue_note: z.string().max(500).optional(),
          });
          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            return apiError("bad_request", "Invalid JSON", 400, headers);
          }
          const parsed = schema.safeParse(raw);
          if (!parsed.success) return apiError("bad_request", "Invalid input", 400, headers);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const patch: Record<string, unknown> = {
            has_issue: parsed.data.has_issue,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          };
          if (parsed.data.issue_note !== undefined) patch.issue_note = parsed.data.issue_note;
          if (!parsed.data.has_issue && parsed.data.issue_note === undefined) patch.issue_note = "";

          const { error } = await supabaseAdmin
            .from("room_status")
            .update(patch as never)
            .eq("property_id", params.id);
          if (error) throw new Error(error.message);
          return apiJson({ ok: true }, 200, headers);
        });
      },
    },
  },
});
