import restobarasImageAsset from "@/assets/restobaras-space.jpg.asset.json";
const restobarasImage = restobarasImageAsset.url;
import restobarasImageWebpAsset from "@/assets/restobaras-space.webp.asset.json";
const restobarasImageWebp = restobarasImageWebpAsset.url;
import { ContactCta } from "@/components/site/ContactCta";
import { PageHero } from "@/components/site/PageHero";
import { PageSection, Prose } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import { contact } from "@/data/contact";
import { SITE_URL } from "@/data/nav";
import { localizePath, type Locale } from "@/lib/locale";
import { pageHead } from "@/lib/seo";

export function restobarasRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () => ({
      ...pageHead({
        path: "/restobaras",
        title: c.restobaras.seoTitle,
        description: c.restobaras.seoDescription,
        locale,
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: "Dharma Stay restobaras",
            description: c.restobaras.seoDescription,
            url: `${SITE_URL}${localizePath("/restobaras", locale)}`,
            telephone: (contact.phones[0] ?? "").replace(/\s/g, ""),
            address: {
              "@type": "PostalAddress",
              streetAddress: "Birutės g. 1",
              addressLocality: "Telšiai",
              postalCode: "87130",
              addressCountry: "LT",
            },
            servesCuisine: "Lietuviška",
            priceRange: "€€",
          }),
        },
      ],
    }),
    component: RestobarPage,
  };
}

function RestobarPage() {
  const c = useContent();
  return (
    <>
      <PageHero
        eyebrow={c.restobaras.eyebrow}
        title={c.restobaras.title}
        lead={c.restobaras.lead}
        image={restobarasImage}
        imageWebp={restobarasImageWebp}
        imageAlt="Dharma Stay restobaras"
        crumbs={[{ label: c.common.nav.home, to: "/" }, { label: c.restobaras.title }]}
      />
      <PageSection>
        <Reveal className="mx-auto max-w-3xl text-center">
          <Prose>
            {c.restobaras.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Prose>
        </Reveal>
        <Reveal className="mt-16" delay={80}>
          <ContactCta title={c.restobaras.ctaTitle} text={c.restobaras.lead} />
        </Reveal>
      </PageSection>
    </>
  );
}
