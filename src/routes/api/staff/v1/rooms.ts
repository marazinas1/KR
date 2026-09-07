import { createFileRoute } from "@tanstack/react-router";
import type { BookingLite } from "@/lib/housekeeping.server";

export const Route = createFileRoute("/api/staff/v1/rooms")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withStaffAuth, apiJson } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ headers, userId }) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { loadGlobalSettings } = await import("@/lib/notifications.server");
          const { localToday, computeDayWork } = await import("@/lib/housekeeping.server");

          const settings = await loadGlobalSettings();
          const url = new URL(request.url);
          const qDate = url.searchParams.get("date");
          const date =
            qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : localToday(settings.timezone);

          const { data: properties } = await supabaseAdmin
            .from("properties")
            .select("id, name, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

          // Atmetamos TIK atšauktos: neapmokėtą rezervaciją turintį kambarį
          // paruošti vis tiek reikia. Intervalas apima ir gyvenančius svečius,
          // ir tą dieną atvykstančius bei išvykstančius.
          const { data: allBookings } = await supabaseAdmin
            .from("bookings")
            .select(
              "property_id, date_from, date_to, status, adults_count, children_count, infants_count, check_in_time, check_out_time, customer_name, extras",
            )
            .neq("status", "cancelled")
            .lte("date_from", date)
            .gte("date_to", date);

          const { data: statuses } = await supabaseAdmin.from("room_status").select("*");
          const { data: tasks } = await supabaseAdmin
            .from("housekeeping_tasks")
            .select("property_id, status, assigned_to, assigned_at")
            .eq("service_date", date);
          const { data: comments } = await supabaseAdmin
            .from("housekeeping_comments")
            .select("property_id")
            .eq("service_date", date);

          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
          const emailOf = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
          const nameOf = new Map(
            (authUsers?.users ?? []).map((u) => [
              u.id,
              ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim(),
            ]),
          );

          const byProperty = new Map<string, BookingLite[]>();
          for (const b of allBookings ?? []) {
            const key = b.property_id as string;
            const list = byProperty.get(key) ?? [];
            list.push(b as unknown as BookingLite);
            byProperty.set(key, list);
          }
          const statusBy = new Map((statuses ?? []).map((s) => [s.property_id as string, s]));
          const taskBy = new Map((tasks ?? []).map((t) => [t.property_id as string, t]));
          const commentCount = new Map<string, number>();
          for (const c of comments ?? []) {
            const k = c.property_id as string;
            commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
          }

          const rooms = (properties ?? [])
            .map((p) => {
              const list = byProperty.get(p.id) ?? [];
              const work = computeDayWork(
                list,
                date,
                Number(settings.stayoverCleanEveryDays ?? 3),
              );
              const st = statusBy.get(p.id);
              const task = taskBy.get(p.id);
              const assignedTo = (task?.assigned_to as string | null) ?? null;

              return {
                id: p.id,
                name: p.name,
                sort_order: p.sort_order ?? 0,
                date,
                work_type: work.work_type,
                priority: work.priority,
                departing: work.departing,
                arriving: work.arriving,
                // Suderinamumui su esama sąsaja:
                checkin_today: work.arriving !== null,
                checkout_today: work.departing !== null,
                occupied_today: list.some((b) => b.date_from <= date && b.date_to > date),
                status: (st?.status as string) ?? "nesvarus",
                note: st?.note ?? "",
                has_issue: st?.has_issue ?? false,
                issue_note: st?.issue_note ?? "",
                task_status: (task?.status as string | null) ?? "laukia",
                assigned_to: assignedTo,
                assigned_to_email: assignedTo ? emailOf.get(assignedTo) ?? null : null,
                assigned_to_name: assignedTo ? nameOf.get(assignedTo) || null : null,
                assigned_to_me: assignedTo === userId,
                comment_count: commentCount.get(p.id) ?? 0,
                updated_at: st?.updated_at ?? null,
              };
            })
            // Kambariai be darbo IR jau švarūs sąraše nereikalingi.
            // Nešvarus kambarys lieka visada — net jei tą dieną nieko nevyksta.
            .filter((r) => r.work_type !== "none" || r.status !== "svarus" || r.has_issue)
            .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order);

          return apiJson({ data: rooms, date }, 200, headers);
        });
      },
    },
  },
});
