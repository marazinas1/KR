import { LegalDocumentPage } from "@/components/site/LegalDocument";
import { getContent, useContent } from "@/content";
import type { Locale } from "@/lib/locale";
import type { LegalDocument } from "@/lib/rentivo-schemas";
import { getLegal } from "@/lib/rentivo.functions";
import { useLooseLoaderData } from "@/lib/route-data";
import { pageHead } from "@/lib/seo";

type LegalLoaderData = { doc: LegalDocument | null };
type Kind = "rental" | "privacy";

/** Shared factory for the two engine-backed legal documents. */
export function legalRoute(locale: Locale, kind: Kind) {
  const c = getContent(locale);
  const doc = c.legal[kind];
  return {
    loader: async (): Promise<LegalLoaderData> => {
      try {
        return { doc: await getLegal({ data: { kind, language: locale } }) };
      } catch {
        return { doc: null };
      }
    },
    head: () => ({
      ...pageHead({
        path: doc.path,
        title: doc.seoTitle,
        description: doc.seoDescription,
        type: "article",
        locale,
      }),
    }),
    component: () => <LegalPage kind={kind} />,
  };
}

function LegalPage({ kind }: { kind: Kind }) {
  const c = useContent();
  const meta = c.legal[kind];
  const { doc } = useLooseLoaderData<LegalLoaderData>();
  return (
    <LegalDocumentPage
      eyebrow={meta.eyebrow}
      title={doc?.html.trim() && doc.name.trim() ? doc.name : meta.title}
      lead={meta.lead}
      doc={doc}
    />
  );
}
