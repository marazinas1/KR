import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { LocaleLink } from "@/components/site/LocaleLink";
import { Reveal } from "@/components/site/Reveal";
import {
  PropertyEmpty,
  PropertyError,
  PropertyGrid,
  PropertyGridSkeleton,
} from "@/components/stay/PropertyGrid";
import { useContent, useLocale } from "@/content";
import { HOME_STAYS_LIMIT, propertiesQuery } from "@/lib/property-queries";
import { CategoryGrid } from "@/components/stay/CategoryCard";
import { groupByCategory, isGrouped, uncategorized } from "@/lib/property-category";
import type { Property } from "@/lib/rentivo-schemas";
import { cn } from "@/lib/utils";

export function StaysSection({
  headless = false,
  initialProperties,
}: {
  headless?: boolean;
  /** Loader-provided snapshot so SSR and hydration render the same markup. */
  initialProperties?: Property[];
}) {
  const { common, home } = useContent();
  const locale = useLocale();
  const { data, isPending, isError, refetch } = useQuery({
    ...propertiesQuery,
    ...(initialProperties ? { initialData: initialProperties } : {}),
  });
  const properties = data ?? [];
  const grouped = isGrouped(properties);
  const groups = grouped ? groupByCategory(properties, locale) : [];
  // Rooms the backend hasn't categorised yet still get a card, below the types.
  const rest = grouped ? uncategorized(properties) : properties.slice(0, HOME_STAYS_LIMIT);
  const hasMore = grouped
    ? rest.length > 0
    : properties.length > HOME_STAYS_LIMIT;

  return (
    <section id="apartamentai" className="scroll-mt-24 bg-linen px-6 pb-24 lg:px-12 lg:pb-32">
      <div className="mx-auto max-w-[84rem]">
        {headless ? null : (
          <div className="max-w-2xl">
            <p className="label-caps text-sage">{home.stays.eyebrow}</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,2.625rem)] leading-tight font-medium text-ink">
              {home.stays.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-stone sm:text-lg">
              {home.stays.lead}
            </p>
          </div>
        )}

        <div className={cn(headless ? "" : "mt-14")}>
          {isPending ? (
            <PropertyGridSkeleton />
          ) : isError ? (
            <PropertyError onRetry={() => void refetch()} />
          ) : properties.length === 0 ? (
            <PropertyEmpty />
          ) : grouped ? (
            <>
              <CategoryGrid groups={groups} />
              {rest.length > 0 ? (
                <div className="mt-8">
                  <PropertyGrid properties={rest} />
                </div>
              ) : null}
            </>
          ) : (
            <PropertyGrid properties={rest} />
          )}
        </div>

        {hasMore ? (
          <Reveal className="mt-12">
            <LocaleLink
              to="/apartamentai"
              className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-sage hover:text-sage-deep"
            >
              {common.cta.allStays}
              <ArrowRight className="arrow-nudge h-4 w-4" aria-hidden />
            </LocaleLink>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
