import { createFileRoute } from "@tanstack/react-router";

import { VacanciesPage } from "@/pages/public/VacanciesPage";
import { publicOrgQuery, vacanciesQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/butai/")({
  head: () =>
    pageHead({
      path: "/butai",
      title: "Laisvi butai ir kambariai — nuomos sąrašas",
      description:
        "Visi laisvi ir netrukus atsilaisvinantys nuomos objektai: kambarių skaičius, plotas, mėnesio nuoma ir tiksli atsilaisvinimo data.",
      locale: "lt",
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(publicOrgQuery),
      context.queryClient.ensureQueryData(vacanciesQuery),
    ]),
  component: () => <VacanciesPage locale="lt" />,
});
