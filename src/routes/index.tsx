import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Nuomos objektai — laisvi butai ir kambariai",
      description:
        "Vieša laisvų ilgalaikės nuomos butų ir kambarių pasiūla. Objektų sąrašas ruošiamas.",
      locale: "lt",
    }),
  component: HomePlaceholder,
});

function HomePlaceholder() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[84rem] flex-col justify-center px-6 py-24 lg:px-12">
      <h1 className="text-3xl font-semibold text-foreground">Nuomos objektai</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Vieša laisvų butų ir kambarių pasiūla bus paskelbta netrukus.
      </p>
    </section>
  );
}
