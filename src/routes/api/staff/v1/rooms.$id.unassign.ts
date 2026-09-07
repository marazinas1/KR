import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/unassign")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      POST: async ({ request, params }) => {
        const { withStaffAuth, apiJson, apiError } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ userId, headers }) => {
          const { z } = await import("zod");
          const schema = z
            .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
            .optional();
          const raw = await request.json().catch(() => ({}));
          const parsed = schema.safeParse(raw);
          if (!parsed.success) return apiError("bad_request", "Invalid input", 400, headers);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { loadGlobalSettings } = await import("@/lib/notifications.server");
          const { localToday } = await import("@/lib/housekeeping.server");
          const settings = await loadGlobalSettings();
          const date = parsed.data?.date ?? localToday(settings.timezone);

          const { data: existing } = await supabaseAdmin
            .from("housekeeping_tasks")
            .select("assigned_to")
            .eq("property_id", params.id)
            .eq("service_date", date)
            .maybeSingle();
          if (!existing || existing.assigned_to !== userId) {
            return apiError("not_yours", "Kambarys priskirtas ne jums", 403, headers);
          }

          const { error } = await supabaseAdmin
            .from("housekeeping_tasks")
            .update({ assigned_to: null, assigned_at: null, updated_by: userId } as never)
            .eq("property_id", params.id)
            .eq("service_date", date);
          if (error) throw new Error(error.message);
          return apiJson({ ok: true, date }, 200, headers);
        });
      },
    },
  },
});
