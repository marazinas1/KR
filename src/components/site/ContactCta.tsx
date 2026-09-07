import { useContent } from "@/content";
import { contact } from "@/data/contact";

/** Small closing block used on the quieter service pages. */
export function ContactCta({ title, text }: { title: string; text?: string }) {
  const { common } = useContent();
  const phone = contact.phones[0] ?? "";
  return (
    <div className="rounded-md bg-sage-deep px-8 py-12 text-center text-warm-white">
      <h2 className="font-display text-[clamp(1.6rem,3.2vw,2.125rem)] font-medium">{title}</h2>
      {text ? <p className="mx-auto mt-4 max-w-xl text-sm text-warm-white/80">{text}</p> : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="rounded-md bg-warm-white px-6 py-3 text-ink transition-opacity hover:opacity-90"
        >
          {phone}
        </a>
        <a
          href={`mailto:${contact.email}`}
          className="rounded-md border border-warm-white/60 px-6 py-3 text-warm-white transition-colors hover:bg-warm-white hover:text-ink"
        >
          {common.cta.contactUs}
        </a>
      </div>
    </div>
  );
}
