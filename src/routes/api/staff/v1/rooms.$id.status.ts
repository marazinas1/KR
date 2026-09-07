import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/status")({
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
          const schema = z.object({
            status: z.enum(["nesvarus", "tvarkoma", "svarus"]),
            note: z.string().max(500).optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          });
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return apiError("bad_request", "Invalid JSON", 400, headers);
          }
          const parsed = schema.safeParse(body);
          if (!parsed.success) return apiError("bad_request", "Invalid input", 400, headers);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { loadGlobalSettings } = await import("@/lib/notifications.server");
          const { localToday, taskStatusForRoomStatus } = await import(
            "@/lib/housekeeping.server"
          );
          const settings = await loadGlobalSettings();
          const date = parsed.data.date ?? localToday(settings.timezone);

          const patch: Record<string, unknown> = {
            status: parsed.data.status,
            updated_by: userId,
          };
          if (parsed.data.note !== undefined) patch.note = parsed.data.note;

          const { error } = await supabaseAdmin
            .from("room_status")
            .update(patch as never)
            .eq("property_id", params.id);
          if (error) throw new Error(error.message);

          // Tos dienos užduoties būsena
          const { error: taskErr } = await supabaseAdmin.from("housekeeping_tasks").upsert(
            {
              property_id: params.id,
              service_date: date,
              status: taskStatusForRoomStatus(parsed.data.status),
              updated_by: userId,
            } as never,
            { onConflict: "property_id,service_date" },
          );
          if (taskErr) throw new Error(taskErr.message);

          return apiJson({ ok: true, date }, 200, headers);
        });
      },
    },
  },
});
