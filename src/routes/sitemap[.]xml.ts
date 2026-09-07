import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { SITE_URL } from "@/data/nav";
import { LOCALES, localizePath } from "@/lib/locale";
import { categorySlug, distinctCategories } from "@/lib/property-category";
import { buildSlugIndex } from "@/lib/property-slug";
import { fetchProperties } from "@/lib/rentivo-api.server";

const STATIC_PATHS = [
  "/",
  "/apartamentai",
  "/apie",
  "/apie/taisykles",
  "/restobaras",
  "/banketine-sale",
  "/sauna",
  "/dovanu-kuponai",
  "/kontaktai",
  "/taisykles",
  "/privatumo-politika",
];

function urlEntry(path: string): string {
  const alternates = LOCALES.map(
    (locale) =>
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE_URL}${localizePath(path, locale)}"/>`,
  ).join("\n");
  return LOCALES.map((locale) =>
    [
      `  <url>`,
      `    <loc>${SITE_URL}${localizePath(path, locale)}</loc>`,
      alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}"/>`,
      `  </url>`,
    ].join("\n"),
  ).join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const paths = [...STATIC_PATHS];

        try {
          const properties = await fetchProperties("lt");
          for (const code of distinctCategories(properties)) {
            paths.push(`/apartamentai/tipas/${categorySlug(code)}`);
          }
          const { byId } = buildSlugIndex(properties);
          for (const slug of byId.values()) {
            paths.push(`/apartamentai/${slug}`);
          }
        } catch {
          // The engine may be unreachable — still serve the static routes.
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...paths.map(urlEntry),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
