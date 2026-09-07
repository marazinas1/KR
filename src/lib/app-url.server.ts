/** Atsarginis kanoninis adresas — naudojamas, kai kliento origin nežinomas. */
export const APP_BASE_URL = "https://demo.revoo.site";

/**
 * Grąžina absoliučią nuorodą.
 * Pirmenybė kliento perduotam origin (kad laiško nuoroda vestų į tą pačią aplinką).
 */
export function appLink(path: string, requestedOrigin?: string): string {
  let base = APP_BASE_URL;
  if (requestedOrigin) {
    try {
      const u = new URL(requestedOrigin);
      const canonicalHost = new URL(APP_BASE_URL).hostname;
      const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      const isCanonical = u.hostname === canonicalHost;
      // Redagavimo/peržiūros aplinkos (lovable.app ir kt.) ignoruojamos —
      // laiško nuoroda visada turi vesti į kanoninį domeną.
      if ((u.protocol === "http:" || u.protocol === "https:") && (isLocal || isCanonical)) {
        base = u.origin;
      }
    } catch {
      /* ignore */
    }
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
