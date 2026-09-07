/**
 * Bendras viešo API (/api/public/v1/*) autentifikacijos sluoksnis.
 * Raktai saugomi tik kaip SHA-256 hash'ai lentelėje public.api_clients.
 */

export type ApiClient = {
  id: string;
  name: string;
  allowed_origins: string[];
};

export async function hashApiKey(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateApiKey(): { raw: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const raw = `rk_live_${hex}`;
  return { raw, prefix: raw.slice(0, 14) };
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (!origin) return base;
  const ok = allowed.length === 0 ? false : allowed.some((a) => a.trim() === origin);
  if (ok) base["Access-Control-Allow-Origin"] = origin;
  return base;
}

export function apiJson(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return apiJson({ error: { code, message } }, status, headers);
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

type Ctx = {
  client: ApiClient;
  ip: string;
  headers: Record<string, string>;
};

type Options = {
  /** Užklausų limitas per 10 min (pagal klientą + IP). 0 = be limito. */
  rateLimit?: number;
};

/**
 * Patikrina Bearer raktą, prideda CORS antraštes, registruoja užklausą
 * ir (jei nurodyta) pritaiko dažnio ribojimą.
 */
export async function withApiAuth(
  request: Request,
  path: string,
  handler: (ctx: Ctx) => Promise<Response>,
  options: Options = {},
): Promise<Response> {
  const origin = request.headers.get("origin");
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return apiError("unauthorized", "Missing API key", 401, corsHeaders(origin, []));
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const keyHash = await hashApiKey(token);
  const { data: row, error } = await supabaseAdmin
    .from("api_clients")
    .select("id, name, allowed_origins, is_active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    console.error("[api-auth]", error.message);
    return apiError("server_error", "Request failed", 500, corsHeaders(origin, []));
  }
  if (!row || !row.is_active) {
    return apiError("unauthorized", "Invalid API key", 401, corsHeaders(origin, []));
  }

  const client: ApiClient = {
    id: row.id,
    name: row.name,
    allowed_origins: (row.allowed_origins as string[]) ?? [],
  };
  const headers = corsHeaders(origin, client.allowed_origins);

  // Naršyklės užklausa iš neleistino domeno atmetama.
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return apiError("forbidden_origin", "Origin not allowed for this API key", 403, headers);
  }

  const ip = clientIp(request);

  if (options.rateLimit && options.rateLimit > 0) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("api_request_log")
      .select("id", { count: "exact", head: true })
      .eq("api_client_id", client.id)
      .eq("ip", ip)
      .eq("path", path)
      .gte("created_at", since);
    if ((count ?? 0) >= options.rateLimit) {
      return apiError("rate_limited", "Too many requests, try again later", 429, headers);
    }
    await supabaseAdmin
      .from("api_request_log")
      .insert({ api_client_id: client.id, path, ip });
  }

  await supabaseAdmin
    .from("api_clients")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", client.id);

  try {
    return await handler({ client, ip, headers });
  } catch (e) {
    console.error(`[api:${path}]`, e instanceof Error ? e.message : e);
    return apiError("server_error", "Request failed", 500, headers);
  }
}

/** CORS preflight atsakymas — raktas dar nesiunčiamas, tad leidžiame plačiai. */
export function preflight(request: Request): Response {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin, []);
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(null, { status: 204, headers });
}