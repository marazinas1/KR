// Server-only email engine.
// Uses `content_templates` for the body and `org_settings` for the toggles.
// Booking-specific notifications were removed with the short-term rental
// module; lease/reading/issue notifications are added in a later step.

import { DEFAULT_PROPERTY_SETTINGS, SETTINGS_COLUMN_MAP, type PropertySettings } from "./property-settings";
import { resolveFromAddress } from "./email-from";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* -------------------------------- sending -------------------------------- */

/** Inline styles so Gmail/Outlook render spacing and list bullets. */
export function wrapEmailHtml(html: string) {
  if (/<html[\s>]/i.test(html)) return html;

  const styled = (html ?? "")
    .replace(/<p(\s[^>]*)?>/gi, '<p style="margin:0 0 14px 0;line-height:1.6;">')
    .replace(/<ul(\s[^>]*)?>/gi, '<ul style="margin:0 0 14px 0;padding-left:22px;list-style-type:disc;">')
    .replace(/<ol(\s[^>]*)?>/gi, '<ol style="margin:0 0 14px 0;padding-left:22px;list-style-type:decimal;">')
    .replace(/<li(\s[^>]*)?>/gi, '<li style="margin:0 0 6px 0;line-height:1.6;display:list-item;">')
    .replace(/<h([1-3])(\s[^>]*)?>/gi, (_m, lvl: string) => `<h${lvl} style="margin:20px 0 10px 0;line-height:1.3;">`)
    .replace(/<blockquote(\s[^>]*)?>/gi,
      '<blockquote style="margin:0 0 14px 0;padding-left:12px;border-left:3px solid #ddd;color:#555;">');

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f6;">
<div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
${styled}
</div></body></html>`;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY nesukonfigūruotas.");
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY nesukonfigūruotas.");
  const from = resolveFromAddress();

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: wrapEmailHtml(opts.html),
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
  return true;
}

/* --------------------------------- data ---------------------------------- */

export async function loadGlobalSettings(): Promise<PropertySettings> {
  const db = await admin();
  const { data: row } = await db
    .from("org_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  const out = { ...DEFAULT_PROPERTY_SETTINGS } as Record<string, unknown>;
  if (row) {
    for (const [key, column] of Object.entries(SETTINGS_COLUMN_MAP)) {
      const raw = (row as Record<string, unknown>)[column];
      if (raw === undefined || raw === null) continue;
      out[key] = raw;
    }
  }
  return out as PropertySettings;
}

export async function loadTemplate(name: string, lang?: string) {
  const db = await admin();
  const { data } = await db
    .from("content_templates")
    .select("id, subject, content, is_enabled, fields")
    .eq("category", "email")
    .eq("template_name", name)
    .maybeSingle();
  if (data) {
    const tpl = data as {
      id: string;
      subject: string;
      content: string;
      is_enabled: boolean;
      fields: Record<string, string>;
    };
    if (lang) {
      const { loadDefaultLanguage, loadTranslations } = await import("./translations.server");
      const defaultLang = await loadDefaultLanguage();
      if (lang !== defaultLang) {
        const tr = await loadTranslations("content_template", [tpl.id], lang);
        const t = tr[tpl.id];
        // Missing translation -> keep the original. Never send an empty email.
        if (t?.["subject"]?.trim()) tpl.subject = t["subject"];
        if (t?.["content"]?.trim()) tpl.content = t["content"];
      }
    }
    return tpl;
  }
  const { CONTENT_TEMPLATES } = await import("./content-templates");
  const def = CONTENT_TEMPLATES.find((t) => t.category === "email" && t.name === name);
  if (!def?.defaultContent) return null;
  return {
    subject: def.defaultSubject ?? "",
    content: def.defaultContent,
    is_enabled: true,
    fields: {} as Record<string, string>,
  };
}

export function renderTokens(text: string, tokens: Record<string, string>) {
  const rendered = Object.entries(tokens).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text ?? "",
  );
  // Unknown variables are never shown as {{...}}.
  return rendered.replace(/\{\{\s*[\w.]+\s*\}\}/g, "");
}

/* --------------------------- scheduled emails ----------------------------- */

/**
 * Runs on a schedule. Lease/reading/payment reminders are implemented in the
 * long-term rental steps; the runner stays wired so the cron route keeps working.
 */
export async function runScheduledNotifications() {
  return { sent: 0 };
}
