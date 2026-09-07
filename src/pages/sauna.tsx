import { EnsoDivider } from "@/components/site/Enso";
import { LocaleLink } from "@/components/site/LocaleLink";
import { PageHero } from "@/components/site/PageHero";
import { PageSection, Prose } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import type { Locale } from "@/lib/locale";
import { pageHead } from "@/lib/seo";

export function saunaRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () =>
      pageHead({
        path: "/sauna",
        title: c.sauna.seoTitle,
        description: c.sauna.seoDescription,
        locale,
      }),
    component: SaunaPage,
  };
}

function SaunaPage() {
  const c = useContent();
  return (
    <>
      <PageHero
        eyebrow={c.sauna.eyebrow}
        title={c.sauna.title}
        lead={c.sauna.lead}
        crumbs={[{ label: c.common.nav.home, to: "/" }, { label: c.sauna.eyebrow }]}
      />
      <PageSection>
        <Reveal className="mx-auto max-w-3xl text-center">
          <Prose>
            {c.sauna.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Prose>
          <EnsoDivider className="my-12" />
          <LocaleLink
            to="/namelis"
            className="inline-flex rounded-md border border-sage px-6 py-3 text-sm font-medium text-sage transition-colors hover:bg-sage hover:text-warm-white"
          >
            {c.sauna.cottageLink}
          </LocaleLink>
        </Reveal>
      </PageSection>
    </>
  );
}
