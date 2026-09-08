/** Documents live in the private `documents` bucket and are read through
 *  short-lived signed URLs. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./admin-guard.server";
import { DOCUMENT_KINDS } from "./rental";

const DOC_COLUMNS =
  "id, unit_id, lease_id, tenant_id, kind, title, file_path, bucket, mime_type, size_bytes, expires_at, created_at";

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unit_id: z.string().uuid().optional(),
        tenant_id: z.string().uuid().optional(),
        lease_id: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    let q = context.supabase.from("documents").select(DOC_COLUMNS);
    if (data.unit_id) q = q.eq("unit_id", data.unit_id);
    if (data.tenant_id) q = q.eq("tenant_id", data.tenant_id);
    if (data.lease_id) q = q.eq("lease_id", data.lease_id);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unit_id: z.string().uuid().nullable().optional(),
        tenant_id: z.string().uuid().nullable().optional(),
        lease_id: z.string().uuid().nullable().optional(),
        kind: z.enum(DOCUMENT_KINDS),
        title: z.string().min(1).max(200),
        file_path: z.string().min(1).max(500),
        mime_type: z.string().max(120).default(""),
        size_bytes: z.number().int().min(0).default(0),
        expires_at: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { error } = await context.supabase.from("documents").insert({
      ...data,
      unit_id: data.unit_id ?? null,
      tenant_id: data.tenant_id ?? null,
      lease_id: data.lease_id ?? null,
      expires_at: data.expires_at || null,
      bucket: "documents",
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ path: z.string().min(1), bucket: z.string().max(40).default("documents") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireManager(context);
    const { data: row } = await context.supabase
      .from("documents")
      .select("file_path, bucket")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.file_path) {
      await context.supabase.storage.from(row.bucket ?? "documents").remove([row.file_path]);
    }
    return { ok: true };
  });
