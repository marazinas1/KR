import { ArrowRight } from "lucide-react";

import { LocaleLink } from "@/components/site/LocaleLink";
import { Reveal } from "@/components/site/Reveal";
import { useContent, useLocale } from "@/content";
import {
  categoryFacts,
  categorySlug,
  optionsLabel,
  type CategoryGroup,
} from "@/lib/property-category";
import { formatPrice } from "@/lib/property-view";

/**
 * Home-page card representing a whole accommodation type. Same look as
 * PropertyCard, but it leads to the filtered listing instead of booking.
 */
export function CategoryCard({ group, index }: { group: CategoryGroup; index: number }) {
  const { common } = useContent();
  const locale = useLocale();
  const facts = categoryFacts(group, locale);
  return (
    <Reveal delay={index * 110}>
      <LocaleLink
        to="/apartamentai/tipas/$categorySlug"
        params={{ categorySlug: categorySlug(group.code) }}
        aria-label={group.label}
        className="group block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      >
      <article className="flex h-full flex-col overflow-hidden rounded-md bg-warm-white shadow-soft transition-shadow duration-500 hover:shadow-lift">
        <div className="aspect-[4/3] overflow-hidden bg-linen">
          {group.image ? (
            <img
              src={group.image}
              alt={group.imageAlt}
              loading="lazy"
              decoding="async"
              className="photo-zoom h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-7">
          <p className="label-caps text-stone">
            {group.priceFrom === null
              ? common.stays.priceOnRequest
              : `${common.labels.priceFrom} ${formatPrice(group.priceFrom)} €`}
          </p>
          <h3 className="mt-3 font-display text-[1.375rem] leading-snug font-semibold text-ink">
            {group.label}
          </h3>
          <p className="mt-4 text-xs tracking-wide text-stone/80">
            {[optionsLabel(group.count, locale), facts].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
            <span className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-sage group-hover:text-sage-deep">
              {common.categoryCard.viewOptions}
              <ArrowRight className="arrow-nudge h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </article>
      </LocaleLink>
    </Reveal>
  );
}

export function CategoryGrid({ groups }: { groups: CategoryGroup[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group, index) => (
        <CategoryCard key={group.code} group={group} index={index} />
      ))}
    </div>
  );
}