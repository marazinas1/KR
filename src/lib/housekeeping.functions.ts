import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./users.server";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getHousekeepingWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ startDate: dateSchema.optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadGlobalSettings } = await import("@/lib/notifications.server");
    const { localToday, addDays, computeDayWork } = await import("@/lib/housekeeping.server");

    const settings = await loadGlobalSettings();
    const start = data.startDate ?? localToday(settings.timezone);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const last = days[days.length - 1]!;

    const { data: properties } = await supabaseAdmin
      .from("properties")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const { data: allBookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "property_id, date_from, date_to, status, adults_count, children_count, infants_count, check_in_time, check_out_time, customer_name, extras",
      )
      .neq("status", "cancelled")
      .lte("date_from", last)
      .gte("date_to", start);

    const { data: statuses } = await supabaseAdmin.from("room_status").select("*");
    const { data: tasks } = await supabaseAdmin
      .from("housekeeping_tasks")
      .select("property_id, service_date, status, assigned_to")
      .in("service_date", days);
    const { data: comments } = await supabaseAdmin
      .from("housekeeping_comments")
      .select("property_id, service_date")
      .in("service_date", days);

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const nameOf = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim() ||
          u.email ||
          "",
      ]),
    );

    const byProperty = new Map<string, unknown[]>();
    for (const b of allBookings ?? []) {
      const k = b.property_id as string;
      const list = byProperty.get(k) ?? [];
      list.push(b);
      byProperty.set(k, list);
    }
    const statusBy = new Map((statuses ?? []).map((s) => [s.property_id as string, s]));
    const taskBy = new Map(
      (tasks ?? []).map((t) => [`${t.property_id as string}|${t.service_date as string}`, t]),
    );
    const commentCount = new Map<string, number>();
    for (const c of comments ?? []) {
      const k = `${c.property_id as string}|${c.service_date as string}`;
      commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
    }

    const stayover = Number(settings.stayoverCleanEveryDays ?? 3);
    const rooms = (properties ?? []).map((p) => {
      const list = (byProperty.get(p.id) ?? []) as Parameters<typeof computeDayWork>[0];
      const st = statusBy.get(p.id);
      return {
        id: p.id,
        name: p.name,
        sort_order: p.sort_order ?? 0,
        status: (st?.status as string) ?? "nesvarus",
        has_issue: Boolean(st?.has_issue),
        issue_note: (st?.issue_note as string) ?? "",
        days: days.map((date) => {
          const work = computeDayWork(list, date, stayover);
          const task = taskBy.get(`${p.id}|${date}`);
          const assigned = (task?.assigned_to as string | null) ?? null;
          return {
            date,
            work_type: work.work_type,
            priority: work.priority,
            task_status: (task?.status as string | null) ?? "laukia",
            assigned_to: assigned,
            assigned_to_name: assigned ? nameOf.get(assigned) || null : null,
            comment_count: commentCount.get(`${p.id}|${date}`) ?? 0,
            departing: work.departing,
            arriving: work.arriving,
          };
        }),
      };
    });

    return { days, rooms };
  });

export const getHousekeepingDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: dateSchema.optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadGlobalSettings } = await import("@/lib/notifications.server");
    const { localToday, computeDayWork } = await import("@/lib/housekeeping.server");

    const settings = await loadGlobalSettings();
    const date = data.date ?? localToday(settings.timezone);

    const { data: properties } = await supabaseAdmin
      .from("properties")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

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
      .select("property_id, status, assigned_to")
      .eq("service_date", date);
    const { data: comments } = await supabaseAdmin
      .from("housekeeping_comments")
      .select("id, property_id, author_id, author_role, body, created_at")
      .eq("service_date", date)
      .order("created_at", { ascending: true });

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const nameOf = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim() ||
          u.email ||
          "",
      ]),
    );

    const byProperty = new Map<string, unknown[]>();
    for (const b of allBookings ?? []) {
      const k = b.property_id as string;
      const list = byProperty.get(k) ?? [];
      list.push(b);
      byProperty.set(k, list);
    }
    const statusBy = new Map((statuses ?? []).map((s) => [s.property_id as string, s]));
    const taskBy = new Map((tasks ?? []).map((t) => [t.property_id as string, t]));

    const stayover = Number(settings.stayoverCleanEveryDays ?? 3);
    const rooms = (properties ?? [])
      .map((p) => {
        const list = (byProperty.get(p.id) ?? []) as Parameters<typeof computeDayWork>[0];
        const work = computeDayWork(list, date, stayover);
        const st = statusBy.get(p.id);
        const task = taskBy.get(p.id);
        const assigned = (task?.assigned_to as string | null) ?? null;
        return {
          id: p.id,
          name: p.name,
          sort_order: p.sort_order ?? 0,
          date,
          work_type: work.work_type,
          priority: work.priority,
          departing: work.departing,
          arriving: work.arriving,
          status: (st?.status as string) ?? "nesvarus",
          has_issue: Boolean(st?.has_issue),
          issue_note: (st?.issue_note as string) ?? "",
          task_status: (task?.status as string | null) ?? "laukia",
          assigned_to: assigned,
          assigned_to_name: assigned ? nameOf.get(assigned) || null : null,
          comments: (comments ?? [])
            .filter((c) => c.property_id === p.id)
            .map((c) => ({
              id: c.id as string,
              author_role: c.author_role as string,
              author_name: c.author_id ? nameOf.get(c.author_id as string) ?? null : null,
              body: c.body as string,
              created_at: c.created_at as string,
            })),
        };
      })
      .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order);

    return { date, rooms };
  });

export const setHousekeepingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid(),
        date: dateSchema,
        status: z.enum(["nesvarus", "tvarkoma", "svarus"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { taskStatusForRoomStatus } = await import("@/lib/housekeeping.server");

    const { error } = await supabaseAdmin
      .from("room_status")
      .upsert(
        {
          property_id: data.propertyId,
          status: data.status,
          updated_by: context.userId,
        } as never,
        { onConflict: "property_id" },
      );
    if (error) throw new Error(error.message);

    const { error: taskErr } = await supabaseAdmin.from("housekeeping_tasks").upsert(
      {
        property_id: data.propertyId,
        service_date: data.date,
        status: taskStatusForRoomStatus(data.status),
        updated_by: context.userId,
      } as never,
      { onConflict: "property_id,service_date" },
    );
    if (taskErr) throw new Error(taskErr.message);
    return { ok: true };
  });

export const assignHousekeepingTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid(),
        date: dateSchema,
        userId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("housekeeping_tasks").upsert(
      {
        property_id: data.propertyId,
        service_date: data.date,
        assigned_to: data.userId,
        assigned_at: data.userId ? new Date().toISOString() : null,
        updated_by: context.userId,
      } as never,
      { onConflict: "property_id,service_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addHousekeepingComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid(),
        date: dateSchema,
        body: z.string().trim().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("housekeeping_comments").insert({
      property_id: data.propertyId,
      service_date: data.date,
      author_id: context.userId,
      author_role: "admin",
      body: data.body,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setHousekeepingIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid(),
        hasIssue: z.boolean(),
        issueNote: z.string().trim().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("room_status").upsert(
      {
        property_id: data.propertyId,
        has_issue: data.hasIssue,
        issue_note: data.hasIssue ? data.issueNote : "",
        updated_by: context.userId,
      } as never,
      { onConflict: "property_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listHousekeepers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["housekeeper", "admin"]);
    const ids = new Set((roles ?? []).map((r) => r.user_id as string));
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    return (authUsers?.users ?? [])
      .filter((u) => ids.has(u.id))
      .map((u) => ({
        id: u.id,
        name:
          ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim() ||
          u.email ||
          "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
