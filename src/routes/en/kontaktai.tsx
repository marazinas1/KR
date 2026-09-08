import { createFileRoute } from "@tanstack/react-router";

import { ContactsPage } from "@/pages/public/ContactsPage";
import { publicOrgQuery } from "@/lib/public-queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/en/kontaktai")({
  head: () =>
    pageHead({
      path: "/kontaktai",
      title: "Contacts and rental inquiry",
      description:
        "Get in touch about long-term flat or room rental: phone, email and an inquiry form with your preferred move-in date.",
      locale: "en",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicOrgQuery),
  component: () => <ContactsPage locale="en" />,
});
