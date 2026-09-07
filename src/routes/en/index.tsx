import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/en/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Rental listings — available flats and rooms",
      description:
        "Public listing of available long-term rental flats and rooms. The listing is being prepared.",
      locale: "en",
    }),
  component: HomePlaceholderEn,
});

function HomePlaceholderEn() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[84rem] flex-col justify-center px-6 py-24 lg:px-12">
      <h1 className="text-3xl font-semibold text-foreground">Rental listings</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        The public listing of available flats and rooms is coming soon.
      </p>
    </section>
  );
}
