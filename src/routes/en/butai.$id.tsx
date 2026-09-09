import { createFileRoute } from "@tanstack/react-router";

import { VacancyDetailPage } from "@/pages/public/VacancyDetailPage";
import { publicOrgQuery, vacancyQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/en/butai/$id")({
  head: ({ params }) =>
    pageHead({
      path: `/butai/${params.id}`,
      title: "Rental unit — monthly rent and move-in date",
      description:
        "Unit details: rooms, area, floor, monthly rent, deposit and the exact date it becomes available. Send an inquiry straight from the page.",
      locale: "en",
    }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(publicOrgQuery),
      context.queryClient.ensureQueryData(vacancyQuery(params.id)),
    ]),
  component: function EnVacancyDetail() {
    const { id } = Route.useParams();
    return <VacancyDetailPage id={id} locale="en" />;
  },
});
