import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "@/data/nav";
import { localizePath } from "@/lib/locale";

/** Public surface paths that currently exist. Extended in step 5. */
const STATIC_PATHS = ["/"];

function urlEntry(path: string) {
  const lt = `${SITE_URL}${localizePath(path, "lt")}`;
  const en = `${SITE_URL}${localizePath(path, "en")}`;
  return [
    "  <url>",
    `    <loc>${lt}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="lt" href="${lt}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${lt}"/>`,
    "  </url>",
  ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...STATIC_PATHS.map(urlEntry),
          "</urlset>",
        ].join("\n");
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
