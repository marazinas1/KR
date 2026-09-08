/** Faults and damage (gedimai) per unit. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./admin-guard.server";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "./rental";

const ISSUE_COLUMNS =
  "id, unit_id, lease_id, reporter_name, category, title, description, priority, status, cost, resolved_at, created_at, photo_paths";

export const listIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ unit_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    let q = context.supabase.from("issues").select(ISSUE_COLUMNS);
    if (data.unit_id) q = q.eq("unit_id", data.unit_id);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unit_id: z.string().uuid(),
        lease_id: z.string().uuid().nullable().optional(),
        category: z.enum(ISSUE_CATEGORIES),
        title: z.string().min(1).max(160),
        description: z.string().max(4000).default(""),
        priority: z.enum(ISSUE_PRIORITIES).default("normal"),
        reporter_name: z.string().max(120).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("issues").insert({
      ...data,
      lease_id: data.lease_id ?? null,
      reported_by: context.userId,
      status: "new",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(ISSUE_STATUSES).optional(),
        priority: z.enum(ISSUE_PRIORITIES).optional(),
        cost: z.number().min(0).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { id, ...patch } = data;
    const row = {
      ...patch,
      ...(patch.status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    };
    const { error } = await context.supabase.from("issues").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listIssueComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ issue_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: rows, error } = await context.supabase
      .from("issue_comments")
      .select("id, issue_id, author_role, body, is_internal, created_at")
      .eq("issue_id", data.issue_id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addIssueComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        issue_id: z.string().uuid(),
        body: z.string().min(1).max(4000),
        is_internal: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("issue_comments").insert({
      ...data,
      author_id: context.userId,
      author_role: "manager",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
