import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { notFound, useLoaderData, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { Suspense } from "react";

import { PropertyError, PropertyGrid, PropertyGridSkeleton } from "@/components/stay/PropertyGrid";
import { StaysShell } from "@/components/stay/StaysShell";
import { getContent } from "@/content";
import { availabilityQuery } from "@/lib/availability-queries";
import { localizePath, type Locale } from "@/lib/locale";
import { categoryLabel, codeForSlug, filterByCategory } from "@/lib/property-category";
import { propertiesQueryFor } from "@/lib/property-queries";
import { breadcrumbLd, pageHead } from "@/lib/seo";
import type { Property } from "@/lib/rentivo-schemas";

type CategorySearch = { nuo?: string; iki?: string; sveciai?: number };
type CategoryLoaderData = { code: string; label: string };

export function categoryRoute(locale: Locale) {
  const c = getContent(locale);

  return {
    validateSearch: (search: Record<string, unknown>): CategorySearch => ({
      ...(typeof search["nuo"] === "string" ? { nuo: search["nuo"] } : {}),
      ...(typeof search["iki"] === "string" ? { iki: search["iki"] } : {}),
      ...(Number.isFinite(Number(search["sveciai"])) && Number(search["sveciai"]) >= 1
        ? { sveciai: Number(search["sveciai"]) }
        : {}),
    }),
    loader: async ({
      context,
      params,
    }: {
      context: { queryClient: { ensureQueryData: (q: unknown) => Promise<unknown> } };
      params: { categorySlug: string };
    }): Promise<CategoryLoaderData> => {
      const properties = (await context.queryClient.ensureQueryData(
        propertiesQueryFor(locale),
      )) as Property[];
      const code = codeForSlug(properties, params.categorySlug);
      if (!code) throw notFound();
      return { code, label: categoryLabel(code, locale) };
    },
    head: ({
      params,
      loaderData,
    }: {
      params: { categorySlug: string };
      loaderData?: CategoryLoaderData;
    }) => {
      const label = loaderData?.label ?? c.apartamentai.title;
      const path = `/apartamentai/tipas/${params.categorySlug}`;
      return {
        ...pageHead({
          path,
          title: c.apartamentai.filteredSeoTitle(label),
          description: c.apartamentai.filteredSeoDescription(label),
          locale,
        }),
        scripts: [
          {
            type: "application/ld+json",
            children: JSON.stringify(
              breadcrumbLd([
                { name: c.common.nav.home, path: localizePath("/", locale) },
                { name: c.apartamentai.title, path: localizePath("/apartamentai", locale) },
                { name: label, path: localizePath(path, locale) },
              ]),
            ),
          },
        ],
      };
    },
    component: () => <CategoryPage locale={locale} />,
    errorComponent: CategoryPageError,
    notFoundComponent: CategoryPageError,
  };
}

function CategoryPage({ locale }: { locale: Locale }) {
  const { code, label } = useLoaderData({ strict: false }) as CategoryLoaderData;
  const { nuo, iki, sveciai } = useSearch({ strict: false }) as CategorySearch;
  return (
    <StaysShell categoryLabelText={label}>
      <Suspense fallback={<PropertyGridSkeleton />}>
        <CategoryList
          locale={locale}
          code={code}
          {...(nuo ? { nuo } : {})}
          {...(iki ? { iki } : {})}
          {...(sveciai ? { sveciai } : {})}
        />
      </Suspense>
    </StaysShell>
  );
}

function CategoryList({
  locale,
  code,
  nuo,
  iki,
  sveciai = 2,
}: {
  locale: Locale;
  code: string;
  nuo?: string;
  iki?: string;
  sveciai?: number;
}) {
  const { data } = useSuspenseQuery(propertiesQueryFor(locale));
  const { data: availability } = useQuery(availabilityQuery(nuo, iki, sveciai));
  const inCategory = filterByCategory(data, code);
  const properties =
    nuo && iki && availability
      ? inCategory.filter((property) => availability.free_ids.includes(property.id))
      : inCategory;
  return (
    <PropertyGrid
      properties={properties}
      {...(nuo ? { nuo } : {})}
      {...(iki ? { iki } : {})}
      sveciai={sveciai}
    />
  );
}

function CategoryPageError() {
  const router = useRouter();
  return (
    <StaysShell>
      <PropertyError onRetry={() => void router.invalidate()} />
    </StaysShell>
  );
}
