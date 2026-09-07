import type { ReactNode } from "react";

import { PageSection, Prose } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { StayFacts, type Fact } from "@/components/stay/StayFacts";

/**
 * The polished stay layout, kept purely presentational: it knows nothing about
 * where the data came from. The dynamic property route feeds it API data.
 */
export function PropertyIntro({
  meta,
  paragraphs,
  image,
  imageAlt,
  facts,
  amenities,
  children,
}: {
  meta?: string;
  paragraphs: string[];
  image?: string | null;
  imageAlt: string;
  facts: Fact[];
  amenities: string[];
  children?: ReactNode;
}) {
  return (
    <PageSection>
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Reveal direction="left">
          {meta ? <p className="label-caps text-sage">{meta}</p> : null}
          <Prose className={meta ? "mt-6" : ""}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Prose>
        </Reveal>
        {image ? (
          <Reveal direction="right" delay={100}>
            <div className="overflow-hidden rounded-md shadow-soft">
              <img
                src={image}
                alt={imageAlt}
                loading="lazy"
                decoding="async"
                width={1200}
                height={900}
                className="photo-zoom h-full w-full object-cover"
              />
            </div>
          </Reveal>
        ) : null}
      </div>

      <div className="mt-16">
        <StayFacts facts={facts} amenities={amenities} />
      </div>

      {children}
    </PageSection>
  );
}

/** Accommodation JSON-LD built from live API fields. */
export function propertyLd(
  property: {
    name: string;
    description?: string | null | undefined;
    area_m2?: number | null | undefined;
    max_guests?: number | null | undefined;
    address?: string | null | undefined;
    city?: string | null | undefined;
    price_per_night?: number | null | undefined;
  },
  amenities: string[],
  url: string,
  image?: string | null,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: property.name,
    description: property.description ?? undefined,
    url,
    ...(image ? { image } : {}),
    ...(property.area_m2 ? { floorSize: `${property.area_m2} m²` } : {}),
    ...(property.max_guests ? { occupancy: String(property.max_guests) } : {}),
    amenityFeature: amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
    })),
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address ?? undefined,
      addressLocality: property.city ?? "Telšiai",
      addressCountry: "LT",
    },
    ...(property.price_per_night ? { priceRange: `nuo ${property.price_per_night} €` } : {}),
  };
}