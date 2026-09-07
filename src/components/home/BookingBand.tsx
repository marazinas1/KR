import { Enso } from "@/components/site/Enso";
import { useContent } from "@/content";
import { AVAILABILITY_SECTION_ID, scrollToId } from "@/lib/scroll-to";

export function BookingBand() {
  const { common, home } = useContent();
  return (
    <section className="bg-sage px-6 py-24 text-warm-white lg:px-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Enso className="h-9 w-9 text-warm-white/60" />
        <h2 className="mt-8 font-display text-[clamp(1.875rem,4.2vw,2.5rem)] leading-tight font-medium">
          {home.bookingBand.title}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-warm-white/85">
          {home.bookingBand.text}
        </p>
        <button
          type="button"
          onClick={() => scrollToId(AVAILABILITY_SECTION_ID)}
          className="mt-9 rounded-md bg-warm-white px-8 py-3.5 text-sm font-medium text-sage-deep transition-colors hover:bg-linen"
        >
          {common.cta.checkDates}
        </button>
      </div>
    </section>
  );
}
