import { PageHero } from "@/components/site/PageHero";
import { PageSection } from "@/components/site/Prose";
import { useContent, useLocale } from "@/content";
import type { LegalDocument as LegalDocumentData } from "@/lib/rentivo-schemas";

/** Renders a legal document served (and sanitized) by the Core backend. */
export function LegalDocumentPage({
  eyebrow,
  title,
  lead,
  doc,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  doc: LegalDocumentData | null;
}) {
  const { common, legal } = useContent();
  const locale = useLocale();
  const hasContent = Boolean(doc && doc.html.trim().length > 0);
  const updated = doc?.updated_at
    ? new Date(doc.updated_at).toLocaleDateString(locale === "en" ? "en-GB" : "lt-LT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        crumbs={[{ label: common.nav.home, to: "/" }, { label: title }]}
      />
      <PageSection>
        <div className="mx-auto max-w-3xl">
          {hasContent ? (
            <>
              <div
                className="legal-prose text-base leading-[1.8] text-stone"
                // Sanitized server-side in src/lib/sanitize-html.ts before it reaches the client.
                dangerouslySetInnerHTML={{ __html: doc?.html ?? "" }}
              />
              {updated ? (
                <p className="mt-12 border-t border-border pt-6 text-sm text-stone">
                  {legal.updatedAt}: {updated}
                </p>
              ) : null}
            </>
          ) : (
            <div className="rounded-md bg-linen p-8">
              <h2 className="font-display text-2xl font-medium text-ink">
                {legal.unavailableTitle}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-stone">{legal.unavailableText}</p>
            </div>
          )}
        </div>
      </PageSection>
    </>
  );
}