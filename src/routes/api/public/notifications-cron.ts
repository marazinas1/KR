import { createFileRoute } from "@tanstack/react-router";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function isAuthorized(provided: string): Promise<boolean> {
  if (!provided) return false;
  const envSecret = process.env.ICAL_SYNC_SECRET;
  if (envSecret && provided === envSecret) return true;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_secrets")
      .select("value")
      .eq("key", "ical_sync_token")
      .maybeSingle();
    return !!data?.value && data.value === provided;
  } catch {
    return false;
  }
}

async function run(request: Request) {
  const provided =
    request.headers.get("x-ical-sync-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (!(await isAuthorized(provided))) return unauthorized();

  try {
    const { runScheduledNotifications } = await import("@/lib/notifications.server");
    const result = await runScheduledNotifications();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notifications-cron]", e);
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/notifications-cron")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
