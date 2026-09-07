import { useSuspenseQuery } from "@tanstack/react-query";
import { redirect, useRouter } from "@tanstack/react-router";
import { Suspense } from "react";

import { CategoryGrid } from "@/components/stay/CategoryCard";
import {
  PropertyError,
  PropertyGrid,
  PropertyGridSkeleton,
} from "@/components/stay/PropertyGrid";
import { StaysShell } from "@/components/stay/StaysShell";
import { getContent } from "@/content";
import { localizePath, type Locale } from "@/lib/locale";
import {
  categorySlug,
  groupByCategory,
  isGrouped,
  normalizeCategory,
  uncategorized,
} from "@/lib/property-category";
import { propertiesQueryFor } from "@/lib/property-queries";
import { breadcrumbLd, pageHead } from "@/lib/seo";

type StaysSearch = { category?: string };

export function staysIndexRoute(locale: Locale) {
  const c = getContent(locale);
  const query = propertiesQueryFor(locale);

  return {
    validateSearch: (search: Record<string, unknown>): StaysSearch => {
      const value = search["category"];
      const raw = typeof value === "string" ? normalizeCategory(value) : "";
      return raw ? { category: raw } : {};
    },
    // Legacy ?category= links keep working — 301 to the clean category path.
    beforeLoad: ({ search }: { search: StaysSearch }) => {
      if (search.category) {
        throw redirect({
          to: localizePath("/apartamentai/tipas/$categorySlug", locale) as never,
          params: { categorySlug: categorySlug(search.category) },
          statusCode: 301,
        });
      }
    },
    head: () => ({
      ...pageHead({
        path: "/apartamentai",
        title: c.apartamentai.seoTitle,
        description: c.apartamentai.seoDescription,
        locale,
      }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbLd([
              { name: c.common.nav.home, path: localizePath("/", locale) },
              { name: c.apartamentai.title, path: localizePath("/apartamentai", locale) },
            ]),
          ),
        },
      ],
    }),
    loader: ({ context }: { context: { queryClient: { ensureQueryData: (q: unknown) => Promise<unknown> } } }) => {
      void context.queryClient.ensureQueryData(query);
    },
    component: () => <StaysIndexPage locale={locale} />,
    errorComponent: StaysIndexError,
  };
}

function StaysIndexPage({ locale }: { locale: Locale }) {
  return (
    <StaysShell>
      <Suspense fallback={<PropertyGridSkeleton />}>
        <PropertyList locale={locale} />
      </Suspense>
    </StaysShell>
  );
}

function PropertyList({ locale }: { locale: Locale }) {
  const { data } = useSuspenseQuery(propertiesQueryFor(locale));

  // Unfiltered view mirrors the home page: one card per accommodation type.
  if (isGrouped(data)) {
    const rest = uncategorized(data);
    return (
      <>
        <CategoryGrid groups={groupByCategory(data, locale)} />
        {rest.length > 0 ? (
          <div className="mt-8">
            <PropertyGrid properties={rest} />
          </div>
        ) : null}
      </>
    );
  }

  return <PropertyGrid properties={data} />;
}

function StaysIndexError() {
  const router = useRouter();
  return (
    <StaysShell>
      <PropertyError onRetry={() => void router.invalidate()} />
    </StaysShell>
  );
}
