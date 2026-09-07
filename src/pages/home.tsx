
import { BookingBand } from "@/components/home/BookingBand";
import { ExtrasSection } from "@/components/home/ExtrasSection";
import { HeroV2 } from "@/components/home/HeroV2";
import { IntroStrip } from "@/components/home/IntroStrip";
import { LocationSection } from "@/components/home/LocationSection";
import { RatingsAndTestimonials } from "@/components/home/RatingsAndTestimonials";
import { StaysSection } from "@/components/home/StaysSection";
import { getContent } from "@/content";
import { SITE_URL } from "@/data/nav";
import type { Locale } from "@/lib/locale";
import { propertiesQueryFor } from "@/lib/property-queries";
import { useLooseLoaderData } from "@/lib/route-data";
import type { Property } from "@/lib/rentivo-schemas";
import { pageHead } from "@/lib/seo";

type HomeLoaderData = { properties: Property[] | null };

export function homeRoute(locale: Locale) {
  const c = getContent(locale);
  const title = c.home.seoTitle;
  const description = c.home.seoDescription;

  return {
    head: () => ({
      ...pageHead({ path: "/", title, description, locale }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            name: "Dharma Stay",
            url: SITE_URL,
            description,
            email: "info@dharmastay.lt",
            telephone: "+37065911929",
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
    loader: async ({ context }: { context: { queryClient: { ensureQueryData: (q: unknown) => Promise<unknown> } } }): Promise<HomeLoaderData> => {
      // Fetch on the server and hand the rows to the component, so SSR and the
      // first client render agree. An API hiccup must not take the landing page
      // down — the section renders its own error state.
      try {
        return {
          properties: (await context.queryClient.ensureQueryData(
            propertiesQueryFor(locale),
          )) as Property[],
        };
      } catch {
        return { properties: null };
      }
    },
    component: Index,
  };
}

function Index() {
  const { properties } = useLooseLoaderData<HomeLoaderData>();

  return (
    <>
      <HeroV2 />
      <IntroStrip />
      <StaysSection {...(properties ? { initialProperties: properties } : {})} />
      <LocationSection />
      <ExtrasSection />
      <RatingsAndTestimonials />
      <BookingBand />
    </>
  );
}
