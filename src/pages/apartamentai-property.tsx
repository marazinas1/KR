import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { notFound, redirect, useLoaderData, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { PageHero } from "@/components/site/PageHero";
import { PageSection } from "@/components/site/Prose";
import { Reveal } from "@/components/site/Reveal";
import { useBooking } from "@/components/site/booking-context";
import {
  AvailabilityCalendar,
  parseApiDate,
  toApiDate,
} from "@/components/stay/AvailabilityCalendar";
import { PropertyError } from "@/components/stay/PropertyGrid";
import { PropertyIntro, propertyLd } from "@/components/stay/PropertySections";
import { StayCrossLinks } from "@/components/stay/StayCrossLinks";
import { useContent } from "@/content";
import { SITE_URL } from "@/data/nav";
import { getContent } from "@/content";
import { localizePath, type Locale } from "@/lib/locale";
import { propertiesQueryFor } from "@/lib/property-queries";
import { formatPrice, toPropertyView } from "@/lib/property-view";
import { getProperty } from "@/lib/rentivo.functions";
import { idForSlug, isUuid, slugForId } from "@/lib/property-slug";
import { breadcrumbLd, pageHead } from "@/lib/seo";
import type { Property } from "@/lib/rentivo-schemas";

const propertyQuery = (id: string, locale: Locale) =>
  queryOptions({
    queryKey: ["property", id, locale],
    queryFn: () => getProperty({ data: { id, language: locale } }),
    staleTime: 60_000,
  });

type PropertySearch = { nuo?: string; iki?: string; sveciai?: number };
type PropertyLoaderData = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  ld: string;
  crumbLd: string;
};

export function propertyRoute(locale: Locale) {
  const c = getContent(locale);

  return {
    validateSearch: (search: Record<string, unknown>): PropertySearch => ({
      ...(typeof search["nuo"] === "string" ? { nuo: search["nuo"] } : {}),
      ...(typeof search["iki"] === "string" ? { iki: search["iki"] } : {}),
      ...(Number.isFinite(Number(search["sveciai"])) && Number(search["sveciai"]) >= 1
        ? { sveciai: Number(search["sveciai"]) }
        : {}),
    }),
    loader: async ({
      context,
      params,
      location,
    }: {
      context: { queryClient: { ensureQueryData: (q: unknown) => Promise<unknown> } };
      params: { propertyId: string };
      location?: { search?: PropertySearch };
    }): Promise<PropertyLoaderData> => {
      const search = location?.search ?? {};
      const properties = (await context.queryClient.ensureQueryData(
        propertiesQueryFor(locale),
      )) as Property[];
      // Legacy UUID URLs permanently redirect to their slug.
      if (isUuid(params.propertyId)) {
        const slug = slugForId(properties, params.propertyId);
        if (slug !== params.propertyId) {
          throw redirect({
            to: localizePath("/apartamentai/$propertyId", locale) as never,
            params: { propertyId: slug },
            search: search as never,
            statusCode: 301,
          });
        }
      }
      const id = idForSlug(properties, params.propertyId);
      if (!id) {
        // Slugs come from localized property names, so a slug minted in the
        // other locale won't resolve here (language switch on a room page).
        // Resolve it against the other locale and redirect to this locale's slug.
        const otherLocale: Locale = locale === "en" ? "lt" : "en";
        const otherProperties = (await context.queryClient.ensureQueryData(
          propertiesQueryFor(otherLocale),
        )) as Property[];
        const otherId = idForSlug(otherProperties, params.propertyId);
        const localSlug = otherId ? slugForId(properties, otherId) : null;
        if (localSlug && localSlug !== params.propertyId) {
          throw redirect({
            to: localizePath("/apartamentai/$propertyId", locale) as never,
            params: { propertyId: localSlug },
            search: search as never,
          });
        }
        throw notFound();
      }
      const property = (await context.queryClient.ensureQueryData(
        propertyQuery(id, locale),
      )) as Property;
      const view = toPropertyView(property, locale);
      return {
        id,
        name: property.name,
        description: (property.description ?? "").slice(0, 155),
        image: view.image,
        ld: JSON.stringify(
          propertyLd(
            property,
            view.amenities,
            `${SITE_URL}${localizePath(`/apartamentai/${params.propertyId}`, locale)}`,
            view.image,
          ),
        ),
        crumbLd: JSON.stringify(
          breadcrumbLd([
            { name: c.common.nav.home, path: localizePath("/", locale) },
            { name: c.apartamentai.title, path: localizePath("/apartamentai", locale) },
            {
              name: property.name,
              path: localizePath(`/apartamentai/${params.propertyId}`, locale),
            },
          ]),
        ),
      };
    },
    head: ({
      params,
      loaderData,
    }: {
      params: { propertyId: string };
      loaderData?: PropertyLoaderData;
    }) => {
      const name = loaderData?.name ?? c.apartamentai.title;
      const description = loaderData?.description || c.apartamentai.seoDescription;
      const head = pageHead({
        path: `/apartamentai/${params.propertyId}`,
        title: `${name} — ${c.common.brand}`,
        description,
        locale,
      });
      return {
        ...head,
        meta: loaderData?.image
          ? [
              ...head.meta,
              { property: "og:image", content: loaderData.image },
              { name: "twitter:image", content: loaderData.image },
            ]
          : head.meta,
        ...(loaderData
          ? {
              scripts: [
                { type: "application/ld+json", children: loaderData.ld },
                { type: "application/ld+json", children: loaderData.crumbLd },
              ],
            }
          : {}),
      };
    },
    component: () => <PropertyPage locale={locale} />,
    errorComponent: () => <PropertyPageError locale={locale} />,
  };
}

function PropertyPage({ locale }: { locale: Locale }) {
  const c = useContent();
  const { id } = useLoaderData({ strict: false }) as PropertyLoaderData;
  const { nuo, iki, sveciai } = useSearch({ strict: false }) as PropertySearch;
  const { data } = useSuspenseQuery(propertyQuery(id, locale));
  const view = toPropertyView(data, locale);
  const { open } = useBooking();
  const gallery = data.image_urls.filter((url) => url !== view.image);
  const sideImage = gallery[0] ?? view.image;
  const grid = (gallery[0] ? gallery.slice(1) : gallery).slice(0, 6);
  // Dates picked earlier (availability band → category list) pre-select here.
  const initialRange = useMemo<DateRange | undefined>(() => {
    const from = nuo ? parseApiDate(nuo) : null;
    const to = iki ? parseApiDate(iki) : null;
    if (!from) return undefined;
    return to ? { from, to } : { from };
  }, [nuo, iki]);
  const [range, setRange] = useState<DateRange | undefined>(initialRange);

  const paragraphs = (data.description ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const facts = [
    ...(data.area_m2 ? [{ label: c.common.labels.size, value: `${data.area_m2} m²` }] : []),
    ...(data.max_guests
      ? [
          {
            label: c.common.labels.guests,
            value: `${c.common.labels.upTo} ${data.max_guests} ${c.common.labels.guestsLower}`,
          },
        ]
      : []),
    ...(data.address || data.city
      ? [{ label: c.common.labels.address, value: data.address ?? data.city ?? "" }]
      : []),
    ...(view.priceFrom !== null
      ? [
          {
            label: c.common.labels.priceFrom,
            value: `${formatPrice(view.priceFrom)} € / ${c.common.labels.perNight}`,
          },
        ]
      : []),
  ];

  const openBooking = () =>
    open(
      data.id,
      {
        ...(range?.from ? { checkin: toApiDate(range.from) } : {}),
        ...(range?.to ? { checkout: toApiDate(range.to) } : {}),
        adults: sveciai && sveciai >= 1 ? sveciai : 2,
      },
      { name: data.name, extras: data.extra_services, maxGuests: data.max_guests ?? null },
    );

  return (
    <>
      <PageHero
        eyebrow={c.apartamentai.eyebrow}
        title={data.name}
        {...(view.meta ? { lead: view.meta } : {})}
        {...(view.image ? { image: view.image } : {})}
        imageAlt={view.imageAlt}
        crumbs={[
          { label: c.common.nav.home, to: "/" },
          { label: c.apartamentai.title, to: "/apartamentai" },
          { label: data.name },
        ]}
      >
        <button
          type="button"
          onClick={openBooking}
          className="rounded-md bg-sage px-7 py-3.5 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep"
        >
          {c.common.cta.book}
          {view.priceFrom === null
            ? ""
            : ` · ${c.common.labels.priceFrom.toLowerCase()} ${formatPrice(view.priceFrom)} €`}
        </button>
      </PageHero>

      <PropertyIntro
        {...(view.meta ? { meta: view.meta } : {})}
        paragraphs={paragraphs}
        image={sideImage}
        imageAlt={view.imageAlt}
        facts={facts}
        amenities={view.amenities}
      />

      {grid.length ? (
        <PageSection tone="linen">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((url, index) => (
              <Reveal key={url} delay={index * 90}>
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-warm-white shadow-soft">
                  <img
                    src={url}
                    alt={`${data.name} — ${c.common.brand}`}
                    loading="lazy"
                    decoding="async"
                    className="photo-zoom h-full w-full object-cover"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </PageSection>
      ) : null}

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          <Reveal direction="left">
            <AvailabilityCalendar
              occupied={data.occupied}
              range={range}
              onRangeChange={setRange}
            />
          </Reveal>
          <Reveal direction="right" delay={100}>
            <div className="rounded-md bg-linen p-8">
              <p className="label-caps text-sage">{c.common.stays.availabilityTitle}</p>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                {data.occupied.length ? c.common.stays.availabilityLead : c.common.stays.noOccupied}
              </p>
              <button
                type="button"
                onClick={openBooking}
                className="mt-6 w-full rounded-md bg-sage px-6 py-3.5 text-sm font-medium text-warm-white transition-colors hover:bg-sage-deep"
              >
                {range?.from && range?.to ? c.common.cta.book : c.common.stays.pickDates}
              </button>
            </div>
          </Reveal>
        </div>
      </PageSection>

      <PageSection tone="linen">
        <StayCrossLinks currentId={data.id} />
      </PageSection>
    </>
  );
}

function PropertyPageError({ locale: _locale }: { locale: Locale }) {
  const c = useContent();
  const router = useRouter();
  return (
    <>
      <PageHero
        eyebrow={c.apartamentai.eyebrow}
        title={c.apartamentai.title}
        crumbs={[
          { label: c.common.nav.home, to: "/" },
          { label: c.apartamentai.title, to: "/apartamentai" },
        ]}
      />
      <PageSection tone="linen">
        <PropertyError onRetry={() => void router.invalidate()} />
      </PageSection>
    </>
  );
}
