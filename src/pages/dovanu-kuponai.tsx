import { ContactCta } from "@/components/site/ContactCta";
import { PageHero } from "@/components/site/PageHero";
import { PageSection, Prose } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import type { Locale } from "@/lib/locale";
import { pageHead } from "@/lib/seo";

export function vouchersRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () =>
      pageHead({
        path: "/dovanu-kuponai",
        title: c.dovanuKuponai.seoTitle,
        description: c.dovanuKuponai.seoDescription,
        locale,
      }),
    component: VouchersPage,
  };
}

function VouchersPage() {
  const c = useContent();
  return (
    <>
      <PageHero
        eyebrow={c.dovanuKuponai.eyebrow}
        title={c.dovanuKuponai.title}
        lead={c.dovanuKuponai.lead}
        crumbs={[{ label: c.common.nav.home, to: "/" }, { label: c.dovanuKuponai.eyebrow }]}
      />
      <PageSection>
        <Reveal className="mx-auto max-w-3xl text-center">
          <Prose>
            {c.dovanuKuponai.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Prose>
        </Reveal>
        <Reveal className="mt-16" delay={80}>
          <ContactCta title={c.dovanuKuponai.ctaTitle} text={c.dovanuKuponai.ctaText} />
        </Reveal>
      </PageSection>
    </>
  );
}
