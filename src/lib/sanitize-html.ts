/**
 * Minimal allowlist sanitizer for HTML that comes from our own Core backend.
 *
 * Runs on the Cloudflare Worker (no DOM), so it is string based on purpose:
 * drop dangerous elements entirely, then strip every attribute that is not
 * explicitly allowed (kills `on*` handlers, `style`, `srcdoc`, …).
 */
const BLOCKED_ELEMENTS =
  /<\s*(script|style|iframe|object|embed|link|meta|form|input|svg)\b[\s\S]*?(<\/\s*\1\s*>|$)/gi;
const SELF_CLOSING_BLOCKED =
  /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|form|input|svg)\b[^>]*>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "small", "span", "div",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
};
function safeHref(value: string): boolean {
  const url = value.trim().toLowerCase();
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("/") ||
    url.startsWith("#")
  );
}
export function sanitizeHtml(input: string): string {
  let html = input
    .replace(COMMENTS, "")
    .replace(BLOCKED_ELEMENTS, "")
    .replace(SELF_CLOSING_BLOCKED, "");
  html = html.replace(
    /<\s*(\/?)\s*([a-zA-Z0-9]+)((?:\s[^>]*)?)\/?>/g,
    (_match, slash: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (slash) return `</${tag}>`;
      const allowed = ALLOWED_ATTRS[tag];
      let attrs = "";
      if (allowed) {
        const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
        let match: RegExpExecArray | null;
        while ((match = attrRe.exec(rawAttrs)) !== null) {
          const name = (match[1] ?? "").toLowerCase();
          const value = match[3] ?? match[4] ?? "";
          if (!allowed.has(name)) continue;
          if (name === "href" && !safeHref(value)) continue;
          attrs += ` ${name}="${value.replace(/"/g, "&quot;")}"`;
        }
        if (tag === "a" && attrs.includes('target="_blank"') && !attrs.includes(" rel=")) {
          attrs += ' rel="noreferrer noopener"';
        }
      }
      return `<${tag}${attrs}>`;
    },
  );
  return html;
}