import { LocaleLink } from "@/components/site/LocaleLink";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

/** Shared chrome for /apartamentai and its category pages. */
export function StaysShell({
  children,
  categoryLabelText,
}: {
  children: React.ReactNode;
  categoryLabelText?: string | null;
}) {
  const { common, apartamentai } = useContent();
  const filtered = Boolean(categoryLabelText);
  return (
    <>
      <PageHero
        eyebrow={filtered ? apartamentai.title : apartamentai.eyebrow}
        title={filtered ? (categoryLabelText as string) : apartamentai.title}
        lead={filtered ? apartamentai.filteredLead(categoryLabelText as string) : apartamentai.lead}
        crumbs={
          filtered
            ? [
                { label: common.nav.home, to: "/" },
                { label: apartamentai.title, to: "/apartamentai" },
                { label: categoryLabelText as string },
              ]
            : [{ label: common.nav.home, to: "/" }, { label: apartamentai.title }]
        }
      />
      <section
        id="apartamentai"
        className="-mt-8 scroll-mt-24 bg-linen px-6 pb-24 lg:px-12 lg:pb-32"
      >
        <div className="mx-auto max-w-[84rem]">
          {filtered ? (
            <div className="mb-8">
              <LocaleLink
                to="/apartamentai"
                className="text-sm font-medium text-sage hover:text-sage-deep"
              >
                ← {apartamentai.clearFilter}
              </LocaleLink>
            </div>
          ) : null}
          {children}
        </div>
      </section>
      <div className="bg-linen px-6 pb-24 lg:px-12 lg:pb-32">
        <Reveal className="mx-auto max-w-[84rem]">
          <p className="text-sm text-stone">{apartamentai.note}</p>
        </Reveal>
      </div>
    </>
  );
}