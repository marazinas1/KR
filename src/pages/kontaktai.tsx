import { ClientOnly } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { Suspense, lazy } from "react";

import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/PageHero";
import { PageSection } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { getContent, useContent } from "@/content";
import { contact } from "@/data/contact";
import { SITE_URL } from "@/data/nav";
import { localizePath, type Locale } from "@/lib/locale";
import { pageHead } from "@/lib/seo";

const LocationMap = lazy(() => import("@/components/home/LocationMap"));

export function contactsRoute(locale: Locale) {
  const c = getContent(locale);
  return {
    head: () => ({
      ...pageHead({
        path: "/kontaktai",
        title: c.kontaktai.seoTitle,
        description: c.kontaktai.seoDescription,
        locale,
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            name: "Dharma Stay",
            description: c.kontaktai.seoDescription,
            url: `${SITE_URL}${localizePath("/kontaktai", locale)}`,
            email: contact.email,
            telephone: contact.phones.map((phone) => phone.replace(/\s/g, "")),
            address: {
              "@type": "PostalAddress",
              streetAddress: "Birutės g. 1",
              addressLocality: "Telšiai",
              postalCode: "87130",
              addressCountry: "LT",
            },
            priceRange: "€€",
          }),
        },
      ],
    }),
    component: ContactsPage,
  };
}

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

function ContactsPage() {
  const c = useContent();
  const kontaktai = c.kontaktai;
  return (
    <>
      <PageHero
        eyebrow={kontaktai.eyebrow}
        title={kontaktai.title}
        lead={kontaktai.lead}
        crumbs={[{ label: c.common.nav.home, to: "/" }, { label: kontaktai.eyebrow }]}
      />

      <PageSection>
        <div className="max-w-[84rem]">
          <div className="grid gap-12 sm:grid-cols-3">
            <Reveal>
              <MapPin className="mx-auto h-5 w-5 text-sage" aria-hidden />
              <h2 className="label-caps mt-4 text-stone/80">{kontaktai.addressLabel}</h2>
              <address className="mt-3 text-base not-italic leading-relaxed text-ink">
                {contact.address}
              </address>
              <p className="mt-2 text-sm text-stone">{kontaktai.cottageNote}</p>
            </Reveal>

            <Reveal delay={80}>
              <Phone className="mx-auto h-5 w-5 text-sage" aria-hidden />
              <h2 className="label-caps mt-4 text-stone/80">{kontaktai.phonesLabel}</h2>
              <div className="mt-3 space-y-2 text-base text-ink">
                {contact.phones.map((phone) => (
                  <p key={phone}>
                    <a className="hover:text-sage" href={`tel:${phone.replace(/\s/g, "")}`}>
                      {phone}
                    </a>
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={160}>
              <Mail className="mx-auto h-5 w-5 text-sage" aria-hidden />
              <h2 className="label-caps mt-4 text-stone/80">{kontaktai.emailLabel}</h2>
              <p className="mt-3 text-base text-ink">
                <a className="hover:text-sage" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={80} className="mt-16">
          <div className="mx-auto max-w-[84rem]">
            <ContactForm />
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-16">
          <div className="mx-auto max-w-[84rem] overflow-hidden rounded-md shadow-soft [filter:grayscale(1)_contrast(0.95)]">
            <div className="h-[360px] lg:h-[500px]">
              <ClientOnly fallback={<MapSkeleton />}>
                <Suspense fallback={<MapSkeleton />}>
                  <LocationMap />
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </Reveal>
      </PageSection>



    </>
  );
}