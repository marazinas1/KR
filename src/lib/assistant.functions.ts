import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export const getAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssistantMessage[]> => {
    const { data, error } = await context.supabase
      .from("assistant_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) {
      console.error("[getAssistantHistory]", error.message);
      return [];
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: r.created_at,
    }));
  });

export const clearAssistantHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("assistant_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) {
      console.error("[clearAssistantHistory]", error.message);
      throw new Error("Nepavyko išvalyti pokalbio.");
    }
    return { ok: true };
  });
