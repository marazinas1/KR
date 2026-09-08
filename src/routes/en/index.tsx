import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/pages/public/HomePage";
import { publicOrgQuery, vacanciesQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/en/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Long-term flats and rooms for rent — current vacancies",
      description:
        "Available and soon-to-be-available long-term rental flats and rooms, each with a real move-in date and monthly rent.",
      locale: "en",
    }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(vacanciesQuery),
      context.queryClient.ensureQueryData(publicOrgQuery),
    ]);
  },
  component: () => <HomePage locale="en" />,
});
