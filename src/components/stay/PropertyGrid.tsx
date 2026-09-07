import { useContent, useLocale } from "@/content";
import { contact } from "@/data/contact";
import { PropertyCard } from "@/components/stay/PropertyCard";
import { toPropertyView } from "@/lib/property-view";
import type { Property } from "@/lib/rentivo-schemas";

export function PropertyGrid({
  properties,
  nuo,
  iki,
  sveciai,
}: {
  properties: Property[];
  nuo?: string;
  iki?: string;
  sveciai?: number;
}) {
  const locale = useLocale();
  if (properties.length === 0) return <PropertyEmpty />;

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {properties.map((property, index) => (
        <PropertyCard
          key={property.id}
          property={toPropertyView(property, locale)}
          index={index}
          {...(nuo ? { nuo } : {})}
          {...(iki ? { iki } : {})}
          {...(sveciai ? { sveciai } : {})}
        />
      ))}
    </div>
  );
}

export function PropertyGridSkeleton() {
  const { common } = useContent();
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="overflow-hidden rounded-md bg-warm-white shadow-soft"
          aria-hidden
        >
          <div className="aspect-[4/3] animate-pulse bg-linen" />
          <div className="space-y-4 p-7">
            <div className="h-3 w-20 animate-pulse rounded-md bg-linen" />
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-linen" />
            <div className="h-3 w-full animate-pulse rounded-md bg-linen" />
            <div className="h-3 w-5/6 animate-pulse rounded-md bg-linen" />
          </div>
        </div>
      ))}
      <span className="sr-only">{common.stays.loading}</span>
    </div>
  );
}

function ContactFallback() {
  return (
    <p className="mt-6 text-sm text-stone">
      {contact.phones.join(" · ")} ·{" "}
      <a className="underline hover:text-sage" href={`mailto:${contact.email}`}>
        {contact.email}
      </a>
    </p>
  );
}

export function PropertyEmpty() {
  const { common } = useContent();
  return (
    <div className="rounded-md bg-warm-white px-8 py-16 text-center shadow-soft">
      <h2 className="font-display text-2xl font-medium text-ink">{common.stays.emptyTitle}</h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-stone">
        {common.stays.emptyText}
      </p>
      <ContactFallback />
    </div>
  );
}

export function PropertyError({ onRetry }: { onRetry: () => void }) {
  const { common } = useContent();
  return (
    <div className="rounded-md bg-warm-white px-8 py-16 text-center shadow-soft" role="alert">
      <h2 className="font-display text-2xl font-medium text-ink">{common.stays.errorTitle}</h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-stone">
        {common.stays.errorText}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-7 rounded-md bg-sage px-6 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep"
      >
        {common.stays.retry}
      </button>
      <ContactFallback />
    </div>
  );
}
