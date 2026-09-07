import { ArrowRight } from "lucide-react";

import { useBooking } from "@/components/site/booking-context";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Reveal } from "@/components/site/Reveal";
import { PropertyGallery } from "@/components/stay/PropertyGallery";
import { useContent } from "@/content";
import { formatPrice, type PropertyView } from "@/lib/property-view";
import { usePropertySlug } from "@/lib/property-slug";

export function PropertyCard({
  property,
  index,
  nuo,
  iki,
  sveciai,
}: {
  property: PropertyView;
  index: number;
  nuo?: string;
  iki?: string;
  sveciai?: number;
}) {
  const { common } = useContent();
  const { open } = useBooking();
  const slugFor = usePropertySlug();
  const dateSearch = {
    ...(nuo ? { nuo } : {}),
    ...(iki ? { iki } : {}),
    ...(sveciai ? { sveciai } : {}),
  };

  return (
    <Reveal delay={index * 110}>
      <LocaleLink
        to="/apartamentai/$propertyId"
        params={{ propertyId: slugFor(property.id) }}
        search={dateSearch}
        aria-label={property.name}
        className="group block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      >
      <article className="flex h-full flex-col overflow-hidden rounded-md bg-warm-white shadow-soft transition-shadow duration-500 hover:shadow-lift">
        <PropertyGallery images={property.images} alt={property.imageAlt} eager={index === 0} />

        <div className="flex flex-1 flex-col p-7">
          <p className="label-caps text-stone">
            {property.priceFrom === null
              ? common.stays.priceOnRequest
              : `${common.labels.priceFrom} ${formatPrice(property.priceFrom)} €`}
          </p>
          <h3 className="mt-3 font-display text-[1.375rem] leading-snug font-semibold text-ink">
            {property.name}
          </h3>
          {property.description ? (
            <p className="mt-3 line-clamp-4 text-[0.95rem] leading-relaxed text-stone">
              {property.description}
            </p>
          ) : null}
          {property.meta ? (
            <p className="mt-4 text-xs tracking-wide text-stone/80">{property.meta}</p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                open(
                  property.id,
                  {
                    ...(nuo ? { checkin: nuo } : {}),
                    ...(iki ? { checkout: iki } : {}),
                    ...(sveciai ? { adults: sveciai } : {}),
                  },
                  { name: property.name },
                );
              }}
              className="rounded-md bg-sage px-5 py-2.5 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep"
            >
              {common.cta.book}
            </button>
            <span className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-sage group-hover:text-sage-deep">
              {common.cta.more}
              <ArrowRight className="arrow-nudge h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </article>
      </LocaleLink>
    </Reveal>
  );
}
