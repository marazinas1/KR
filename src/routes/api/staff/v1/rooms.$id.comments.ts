import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/comments")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request, params }) => {
        const { withStaffAuth, apiJson } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ headers }) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { loadGlobalSettings } = await import("@/lib/notifications.server");
          const { localToday } = await import("@/lib/housekeeping.server");
          const settings = await loadGlobalSettings();
          const url = new URL(request.url);
          const q = url.searchParams.get("date");
          const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : localToday(settings.timezone);

          const { data: rows } = await supabaseAdmin
            .from("housekeeping_comments")
            .select("id, author_id, author_role, body, created_at")
            .eq("property_id", params.id)
            .eq("service_date", date)
            .order("created_at", { ascending: true });

          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
          const infoOf = new Map(
            (authUsers?.users ?? []).map((u) => [
              u.id,
              ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim() ||
                u.email ||
                "",
            ]),
          );

          const data = (rows ?? []).map((r) => ({
            id: r.id,
            author_role: r.author_role,
            author_name: r.author_id ? infoOf.get(r.author_id as string) ?? null : null,
            body: r.body,
            created_at: r.created_at,
          }));
          return apiJson({ data, date }, 200, headers);
        });
      },
      POST: async ({ request, params }) => {
        const { withStaffAuth, apiJson, apiError } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ headers, userId, role }) => {
          const { z } = await import("zod");
          const schema = z.object({
            body: z.string().trim().min(1).max(1000),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
          const { loadGlobalSettings } = await import("@/lib/notifications.server");
          const { localToday } = await import("@/lib/housekeeping.server");
          const settings = await loadGlobalSettings();
          const date = parsed.data.date ?? localToday(settings.timezone);

          const { error } = await supabaseAdmin.from("housekeeping_comments").insert({
            property_id: params.id,
            service_date: date,
            author_id: userId,
            author_role: role,
            body: parsed.data.body,
          } as never);
          if (error) throw new Error(error.message);
          return apiJson({ ok: true }, 200, headers);
        });
      },
    },
  },
});
