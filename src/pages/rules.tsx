import { PageHero } from "@/components/site/PageHero";
import { PageSection } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import { SITE_URL } from "@/data/nav";
import { localizePath, type Locale } from "@/lib/locale";
import { breadcrumbLd, pageHead } from "@/lib/seo";

export function rulesRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () => ({
      ...pageHead({
        path: "/apie/taisykles",
        title: c.taisykles.seoTitle,
        description: c.taisykles.seoDescription,
        type: "article",
        locale,
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: c.taisykles.title,
            description: c.taisykles.seoDescription,
            url: `${SITE_URL}${localizePath("/apie/taisykles", locale)}`,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbLd([
              { name: c.common.nav.home, path: localizePath("/", locale) },
              { name: c.apie.title, path: localizePath("/apie", locale) },
              { name: c.taisykles.title, path: localizePath("/apie/taisykles", locale) },
            ]),
          ),
        },
      ],
    }),
    component: RulesPage,
  };
}

function RulesPage() {
  const c = useContent();
  return (
    <>
      <PageHero
        eyebrow={c.taisykles.eyebrow}
        title={c.taisykles.title}
        lead={c.taisykles.lead}
        crumbs={[
          { label: c.common.nav.home, to: "/" },
          { label: c.apie.title, to: "/apie" },
          { label: c.taisykles.title },
        ]}
      />

      <PageSection>
        <div className="grid gap-12 sm:grid-cols-2">
          {c.taisykles.groups.map((group, index) => (
            <Reveal key={group.title} delay={index * 80}>
              <h2 className="font-display text-xl font-semibold text-ink">{group.title}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </PageSection>
    </>
  );
}
