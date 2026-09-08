import { createFileRoute } from "@tanstack/react-router";

import { VacanciesPage } from "@/pages/public/VacanciesPage";
import { vacanciesQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/en/butai/")({
  head: () =>
    pageHead({
      path: "/butai",
      title: "Available flats and rooms — rental listing",
      description:
        "Every available and soon-to-be-available rental unit: rooms, area, monthly rent and the exact date it becomes free.",
      locale: "en",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(vacanciesQuery),
  component: () => <VacanciesPage locale="en" />,
});
