import banquetImageAsset from "@/assets/banketine-sale.jpg.asset.json";
const banquetImage = banquetImageAsset.url;
import banquetImageWebpAsset from "@/assets/banketine-sale.webp.asset.json";
const banquetImageWebp = banquetImageWebpAsset.url;
import { ContactCta } from "@/components/site/ContactCta";
import { PageHero } from "@/components/site/PageHero";
import { PageSection, Prose } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import type { Locale } from "@/lib/locale";
import { pageHead } from "@/lib/seo";

export function banquetRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () =>
      pageHead({
        path: "/banketine-sale",
        title: c.banketineSale.seoTitle,
        description: c.banketineSale.seoDescription,
        locale,
      }),
    component: BanquetPage,
  };
}

function BanquetPage() {
  const c = useContent();
  return (
    <>
      <PageHero
        eyebrow={c.banketineSale.eyebrow}
        title={c.banketineSale.title}
        lead={c.banketineSale.lead}
        image={banquetImage}
        imageWebp={banquetImageWebp}
        imageAlt="Banketinė salė Dharma Stay kieme Telšiuose"
        crumbs={[{ label: c.common.nav.home, to: "/" }, { label: c.banketineSale.title }]}
      />
      <PageSection>
        <Reveal className="mx-auto max-w-3xl text-center">
          <Prose>
            {c.banketineSale.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Prose>
        </Reveal>
        <Reveal className="mt-16" delay={80}>
          <ContactCta title={c.banketineSale.ctaTitle} text={c.banketineSale.lead} />
        </Reveal>
      </PageSection>
    </>
  );
}
