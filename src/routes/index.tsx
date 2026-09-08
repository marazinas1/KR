import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/pages/public/HomePage";
import { publicOrgQuery, vacanciesQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Ilgalaikė butų ir kambarių nuoma — laisvi objektai",
      description:
        "Laisvi ir netrukus atsilaisvinantys ilgalaikės nuomos butai bei kambariai su tikslia atsilaisvinimo data ir mėnesio nuomos kaina.",
      locale: "lt",
    }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(vacanciesQuery),
      context.queryClient.ensureQueryData(publicOrgQuery),
    ]);
  },
  component: () => <HomePage locale="lt" />,
});
