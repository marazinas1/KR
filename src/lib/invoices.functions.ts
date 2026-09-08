import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertManager(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "manager",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context);
    const { data, error } = await context.supabase
      .from("invoices")
      .select("*")
      .order("issue_date", { ascending: false })
      .order("invoice_number", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const createInput = z.object({
  buyer: z.object({
    name: z.string().min(1).max(200),
    code: z.string().max(50).optional().default(""),
    vatCode: z.string().max(50).optional().default(""),
    address: z.string().max(300).optional().default(""),
    phone: z.string().max(50).optional().default(""),
    email: z.string().max(200).optional().default(""),
  }),
  lineItems: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        qty: z.number().positive().max(100000),
        unit: z.string().max(20).optional().default("vnt."),
        gross: z.number().nonnegative().max(1000000),
      }),
    )
    .min(1),
  leaseId: z.string().uuid().nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { createInvoiceRecord } = await import("./invoices.server");
    return await createInvoiceRecord(data);
  });
