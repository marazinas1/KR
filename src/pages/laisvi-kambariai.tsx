import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";


import { plural } from "@/components/search/plural";
import { SearchBar, type SearchValues } from "@/components/search/SearchBar";
import { useBooking } from "@/components/site/booking-context";
import { Enso } from "@/components/site/Enso";
import { getContent, useContent, useLocale } from "@/content";
import { availabilityQuery } from "@/lib/availability-queries";
import type { Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import { propertiesQueryFor } from "@/lib/property-queries";
import { formatPrice, toPropertyView } from "@/lib/property-view";
import type { Property } from "@/lib/rentivo-schemas";
import { pageHead } from "@/lib/seo";

type ResultsSearch = SearchValues;

function numberParam(value: unknown, min: number): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? Math.floor(parsed) : undefined;
}

function pick(key: string, value: number | undefined): Record<string, number> {
  return value === undefined ? {} : { [key]: value };
}

export function availabilityResultsRoute(locale: Locale) {
  const c = getContent(locale);

  return {
    validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
      ...(typeof search["nuo"] === "string" ? { nuo: search["nuo"] } : {}),
      ...(typeof search["iki"] === "string" ? { iki: search["iki"] } : {}),
      ...pick("suauge", numberParam(search["suauge"], 1)),
      ...pick("vaikai", numberParam(search["vaikai"], 0)),
      ...pick("kudikiai", numberParam(search["kudikiai"], 0)),
    }),
    head: () => {
      const head = pageHead({
        path: "/laisvi-kambariai",
        title: c.common.results.seoTitle,
        description: c.common.results.seoDescription,
        locale,
      });
      return { ...head, meta: [...head.meta, { name: "robots", content: "noindex" }] };
    },
    component: () => <ResultsPage locale={locale} />,
  };
}

function ResultsPage({ locale }: { locale: Locale }) {
  const { common } = useContent();
  const search = useSearch({ strict: false }) as ResultsSearch;
  const adults = search.suauge ?? 2;
  const children = search.vaikai ?? 0;
  const seats = adults + children;

  const availability = useQuery(availabilityQuery(search.nuo, search.iki, seats));
  const properties = useQuery(propertiesQueryFor(locale));

  const hasDates = Boolean(search.nuo && search.iki);
  const loading = hasDates && (availability.isPending || availability.isFetching || properties.isPending);
  const failed = availability.isError || properties.isError;

  const freeIds = availability.data?.free_ids ?? [];
  const totals = new Map(
    (availability.data?.free_units ?? []).map((unit) => [unit.id, unit.total] as const),
  );
  const rooms = (properties.data ?? []).filter((property) => freeIds.includes(property.id));
  const nights = availability.data?.nights ?? 0;

  return (
    <>
      <section className="bg-linen px-6 pt-32 pb-8 lg:px-12 lg:pt-36">
        <div className="mx-auto max-w-[84rem] text-center">
          <Enso className="mx-auto h-9 w-9 text-sage/70" />
          <p className="label-caps mt-6 text-sage">{common.results.eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.12] font-medium text-ink">
            {common.results.title}
          </h1>
        </div>
      </section>

      <section className="bg-linen px-6 pb-24 lg:px-12">
        <div className="mx-auto grid max-w-[84rem] gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            {/* keeps the calendar card top aligned with the first room card */}
            {hasDates && !failed && !loading && rooms.length > 0 ? (
              <p className="hidden pb-4 text-sm text-transparent lg:block" aria-hidden>
                .
              </p>
            ) : null}
            <SearchBar variant="compact" initial={search} />
          </aside>


          <div>
            {!hasDates ? (
              <p className="py-10 text-center text-sm text-stone">{common.results.missingDates}</p>
            ) : failed ? (
              <div className="py-10 text-center text-sm text-stone">
                <p>{common.results.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    void availability.refetch();
                    void properties.refetch();
                  }}
                  className="mt-5 rounded-md bg-sage px-6 py-2.5 text-xs font-medium text-warm-white transition-colors hover:bg-sage-deep"
                >
                  {common.results.retry}
                </button>
              </div>
            ) : loading ? (
              <div className="grid gap-6">
                {[0, 1, 2].map((key) => (
                  <div
                    key={key}
                    className="h-56 animate-pulse rounded-md bg-warm-white/70 shadow-soft"
                  />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-display text-2xl text-ink">{common.results.empty}</p>
                <p className="mt-3 text-sm text-stone">{common.results.emptyHint}</p>
              </div>
            ) : (
              <>
                <p className="pb-4 text-sm text-stone">
                  {rooms.length}{" "}
                  {plural(
                    rooms.length,
                    common.results.foundOne,
                    common.results.foundFew,
                    common.results.foundMany,
                  )}
                </p>

                <div className="grid gap-6">
                  {rooms.map((property) => (
                    <RoomResultCard
                      key={property.id}
                      property={property}
                      locale={locale}
                      nights={nights}
                      total={totals.get(property.id) ?? null}
                      checkin={search.nuo as string}
                      checkout={search.iki as string}
                      adults={seats}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}


function RoomResultCard({
  property,
  locale,
  nights,
  total,
  checkin,
  checkout,
  adults,
}: {
  property: Property;
  locale: Locale;
  nights: number;
  total: number | null;
  checkin: string;
  checkout: string;
  adults: number;
}) {
  const { common } = useContent();
  const { open } = useBooking();
  const [gallery, setGallery] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const view = toPropertyView(property, locale);
  const images = [view.image, ...property.image_urls].filter(
    (src, index, all): src is string => Boolean(src) && all.indexOf(src) === index,
  );
  const perNight = total !== null && nights > 0 ? total / nights : view.priceFrom;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-warm-white shadow-soft transition-colors",
        expanded ? "border-sage/50 shadow-lift" : "border-border hover:border-sage/40",
      )}
    >
      <div className="grid gap-4 p-4 md:grid-cols-[13rem_1fr_12rem] md:items-start md:gap-5">
        <button
          type="button"
          onClick={() => setGallery(true)}
          aria-label={common.results.openGallery}
          className="group relative aspect-[4/3] w-full overflow-hidden rounded-md bg-linen"
        >
          {images[0] ? (
            <img
              src={images[0]}
              alt={view.imageAlt}
              loading="lazy"
              decoding="async"
              className="photo-zoom h-full w-full object-cover"
            />
          ) : null}
          {images.length > 1 ? (
            <span className="absolute bottom-2 left-2 rounded-md bg-ink/70 px-2.5 py-1 text-[0.7rem] text-warm-white">
              {common.results.openGallery} · {images.length}
            </span>
          ) : null}
        </button>

        <div className="flex flex-col">
          <h2 className="font-display text-[1.375rem] leading-snug font-semibold text-ink">
            {view.name}
          </h2>
          {view.meta ? (
            <p className="mt-2 text-xs tracking-wide text-stone/80">{view.meta}</p>
          ) : null}
          {view.description && !expanded ? (
            <p className="mt-3 line-clamp-2 text-[0.95rem] leading-relaxed text-stone">
              {view.description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-2 self-start text-sm font-medium text-sage underline underline-offset-4 transition-colors hover:text-sage-deep"
          >
            {expanded ? common.results.lessInfo : common.results.moreInfo}
          </button>
          {view.amenities.length > 0 && !expanded ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {view.amenities.slice(0, 4).map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-md border border-border px-3 py-1 text-xs text-stone"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-4 border-t border-border pt-4 md:h-full md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-5 md:text-right">
          <div className="md:text-right">
            <p className="font-display text-2xl font-semibold text-ink">
              {total !== null
                ? `${formatPrice(total)} €`
                : view.priceFrom !== null
                  ? `${common.labels.priceFrom} ${formatPrice(view.priceFrom)} €`
                  : common.stays.priceOnRequest}
            </p>
            <p className="mt-1 text-xs text-stone">
              {total !== null ? common.results.forStay : ""}
              {perNight !== null && perNight !== undefined
                ? `${total !== null ? " · " : ""}${common.labels.priceFrom} ${formatPrice(Math.round(perNight))} € / ${common.results.perNight}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => open(property.id, { checkin, checkout, adults }, { name: property.name })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sage px-5 py-3 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep md:mt-auto"
          >
            {common.cta.book}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border px-4 py-6 sm:px-6">
          <h3 className="label-caps text-sage">{common.results.detailsTitle}</h3>
          {view.description ? (
            <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-stone">
              {view.description}
            </p>
          ) : null}
          {view.amenities.length > 0 ? (
            <>
              <h4 className="mt-6 font-display text-lg font-semibold text-ink">
                {common.results.amenitiesTitle}
              </h4>
              <ul className="mt-3 flex flex-wrap gap-2">
                {view.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="rounded-md border border-border px-3 py-1 text-xs text-stone"
                  >
                    {amenity}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {gallery ? (
        <Lightbox images={images} alt={view.imageAlt} onClose={() => setGallery(false)} />
      ) : null}
    </article>
  );
}

function Lightbox({
  images,
  alt,
  onClose,
}: {
  images: string[];
  alt: string;
  onClose: () => void;
}) {
  const { common } = useContent();
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const current = images[index];
  const count = images.length;

  const step = useCallback(
    (delta: number) => setIndex((value) => (value + delta + count) % count),
    [count],
  );

  useEffect(() => {
    dialog.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, step]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink/90 p-6 outline-none"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={common.results.closeGallery}
        className="absolute right-6 top-6 text-warm-white/80 transition-colors hover:text-warm-white"
      >
        <X className="h-7 w-7" aria-hidden />
      </button>

      <div
        className="relative flex w-full max-w-5xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {count > 1 ? (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={common.results.prev}
            className="absolute left-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 text-warm-white transition-colors hover:bg-warm-white hover:text-ink sm:-left-4"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        ) : null}

        {current ? (
          <img
            src={current}
            alt={alt}
            className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
          />
        ) : null}

        {count > 1 ? (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={common.results.next}
            className="absolute right-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 text-warm-white transition-colors hover:bg-warm-white hover:text-ink sm:-right-4"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        ) : null}
      </div>

      {count > 1 ? (
        <div
          className="mt-5 flex w-full max-w-5xl flex-col items-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-sm text-warm-white/80">
            {index + 1} / {count}
          </span>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {images.map((src, position) => (
              <button
                key={src}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`${position + 1} / ${count}`}
                aria-current={position === index}
                className={cn(
                  "h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                  position === index ? "border-warm-white" : "border-transparent opacity-70",
                )}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
