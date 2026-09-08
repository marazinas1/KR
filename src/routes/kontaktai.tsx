import { createFileRoute } from "@tanstack/react-router";

import { ContactsPage } from "@/pages/public/ContactsPage";
import { publicOrgQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/kontaktai")({
  head: () =>
    pageHead({
      path: "/kontaktai",
      title: "Kontaktai ir nuomos užklausa",
      description:
        "Susisiekite dėl ilgalaikės butų ar kambarių nuomos: telefonas, el. paštas ir užklausos forma su pageidaujama įsikraustymo data.",
      locale: "lt",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicOrgQuery),
  component: () => <ContactsPage locale="lt" />,
});
