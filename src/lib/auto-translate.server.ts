// Server-only: automatinis tekstų vertimas per Lovable AI Gateway.
// Saugo HTML žymėjimą ir {{kintamuosius}} — jie neverčiami.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type TranslateItem = { field: string; text: string; html?: boolean };

const LANG_NAMES: Record<string, string> = {
  lt: "Lithuanian",
  en: "English",
};

function langName(code: string) {
  return LANG_NAMES[code] ?? code.toUpperCase();
}

function systemPrompt(from: string, to: string) {
  return [
    `You are a professional translator for a real-estate (short-term rental) booking platform.`,
    `Translate values from ${langName(from)} to ${langName(to)}.`,
    `Rules:`,
    `- Keep HTML markup exactly as-is (tags, attributes, nesting); translate only the visible text.`,
    `- NEVER translate, rename, reorder or remove template variables written as {{something}} — copy them verbatim.`,
    `- Keep line breaks and formatting. Do not add commentary.`,
    `- Preserve proper names, brand names, emails, URLs, numbers and currency symbols.`,
    `- Return strict json matching the requested schema.`,
  ].join("\n");
}

/** Verčia laukų rinkinį vienu kvietimu; grąžina { field: translation }. */
export async function translateFields(
  items: TranslateItem[],
  fromLang: string,
  toLang: string,
): Promise<Record<string, string>> {
  const usable = items.filter((i) => i.text && i.text.trim() !== "");
  if (usable.length === 0) return {};

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI vertimas nesukonfigūruotas (trūksta rakto).");

  const payload = Object.fromEntries(usable.map((i, idx) => [String(idx), i.text]));

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt(fromLang, toLang) },
        {
          role: "user",
          content:
            `Translate every value of this json object. Reply with json using the SAME keys ` +
            `and translated values only:\n\n` +
            JSON.stringify(payload, null, 2),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI vertimo limitas viršytas — pabandykite po kelių minučių.");
  if (res.status === 402) throw new Error("Nepakanka AI kreditų vertimui.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[translateFields]", res.status, body.slice(0, 500));
    throw new Error(`AI vertimo klaida (${res.status}).`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI grąžino netinkamą atsakymą.");
    parsed = JSON.parse(m[0]) as Record<string, unknown>;
  }

  const out: Record<string, string> = {};
  usable.forEach((item, idx) => {
    const v = parsed[String(idx)];
    if (typeof v === "string" && v.trim() !== "") out[item.field] = v.trim();
  });
  return out;
}
