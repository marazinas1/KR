import { createFileRoute } from "@tanstack/react-router";

import { VacancyDetailPage } from "@/pages/public/VacancyDetailPage";
import { publicOrgQuery, vacancyQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/butai/$id")({
  head: ({ params }) =>
    pageHead({
      path: `/butai/${params.id}`,
      title: "Nuomojamas objektas — kaina ir atsilaisvinimo data",
      description:
        "Objekto informacija: kambariai, plotas, aukštas, mėnesio nuoma, depozitas ir tiksli atsilaisvinimo data. Užklausą galima pateikti iš karto.",
      locale: "lt",
    }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(publicOrgQuery),
      context.queryClient.ensureQueryData(vacancyQuery(params.id)),
    ]),
  component: function LtVacancyDetail() {
    const { id } = Route.useParams();
    return <VacancyDetailPage id={id} locale="lt" />;
  },
});
