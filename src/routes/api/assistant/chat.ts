import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  ASSISTANT_HISTORY_LIMIT,
  ASSISTANT_HOURLY_LIMIT,
  ASSISTANT_MAX_MESSAGE_CHARS,
  buildSystemPrompt,
  type AssistantLang,
} from "@/lib/assistant-knowledge";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(ASSISTANT_MAX_MESSAGE_CHARS),
  lang: z.enum(["lt", "en"]).default("lt"),
  path: z.string().max(300).default(""),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function limitMessage(lang: AssistantLang) {
  return lang === "en"
    ? "Message limit reached for this hour. Please try again a bit later."
    : "Pasiektas šios valandos žinučių limitas. Pabandykite kiek vėliau.";
}

function gatewayErrorMessage(status: number, lang: AssistantLang, upstream: string) {
  const en = lang === "en";
  if (status === 429) return en ? "The assistant is busy right now, please try again in a moment." : "Asistentas šiuo metu užimtas, pabandykite po akimirkos.";
  if (status === 402) return en ? "AI credits are exhausted. The workspace owner needs to top up credits." : "Baigėsi AI kreditai. Darbo srities savininkui reikia papildyti kreditus.";
  if (status === 403) return en ? "AI assistant is blocked by workspace policy." : "AI asistentas užblokuotas darbo srities nustatymais.";
  console.error("[assistant] gateway", status, upstream.slice(0, 300));
  return en ? "The assistant is temporarily unavailable." : "Asistentas laikinai nepasiekiamas.";
}

async function handlePost(request: Request) {
  const { authenticateAdminRequest } = await import("@/lib/assistant-auth.server");
  const auth = await authenticateAdminRequest(request);
  if (!auth) return json(401, { error: "Unauthorized" });
  const { supabase, userId } = auth;

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return json(400, { error: "Invalid input" });
  }
  const lang = input.lang as AssistantLang;

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json(500, { error: "AI not configured" });

  // Limitas per valandą
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("assistant_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= ASSISTANT_HOURLY_LIMIT) return json(429, { error: limitMessage(lang) });

  // Istorija
  const { data: historyRows } = await supabase
    .from("assistant_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(ASSISTANT_HISTORY_LIMIT);
  const history = (historyRows ?? []).reverse() as { role: "user" | "assistant"; content: string }[];

  // Kontekstas
  const ctx = await import("@/lib/assistant-context.server");
  const { buildBusinessAnalytics } = await import("@/lib/assistant-analytics.server");
  const [settings, propertiesSummary, businessAnalytics] = await Promise.all([
    ctx.loadSettingsForAssistant(supabase),
    ctx.buildPropertiesSummary(supabase, lang),
    buildBusinessAnalytics(supabase, lang).catch((e) => {
      console.error("[assistant] analytics", e);
      return undefined;
    }),
  ]);
  const settingsKnowledge = ctx.buildSettingsKnowledge(lang, settings);
  const system = buildSystemPrompt({
    lang,
    brandName: settings.displayName?.trim() || "Deerva",
    settingsKnowledge,
    propertiesSummary,
    businessAnalytics,
    currentPath: input.path,
  });

  // Išsaugome vartotojo žinutę
  const { error: insertErr } = await supabase
    .from("assistant_messages")
    .insert({ user_id: userId, role: "user", content: input.message });
  if (insertErr) {
    console.error("[assistant] insert user msg", insertErr.message);
    return json(500, { error: "Failed to save message" });
  }

  const upstream = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.message },
      ],
    }),
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return json(upstream.status >= 500 ? 502 : upstream.status, {
      error: gatewayErrorMessage(upstream.status, lang, text),
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                send({ t: delta });
              }
            } catch {
              // eilutė užbaigta \n, bet ne JSON – praleidžiame
            }
          }
        }
      } catch (e) {
        console.error("[assistant] stream", e);
      } finally {
        const text = full.trim();
        if (text) {
          const { error } = await supabase
            .from("assistant_messages")
            .insert({ user_id: userId, role: "assistant", content: text });
          if (error) console.error("[assistant] insert assistant msg", error.message);
        }
        send({ done: true });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

export const Route = createFileRoute("/api/assistant/chat")({
  server: {
    handlers: {
      POST: ({ request }) => handlePost(request),
    },
  },
});
