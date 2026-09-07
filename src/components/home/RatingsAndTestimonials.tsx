import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { EnsoFrame } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";
import { cn } from "@/lib/utils";

/**
 * Merged ratings + testimonials section for Home V2.
 * One eyebrow, one heading; the two aggregate Booking.com scores sit as a
 * compact row above the testimonials carousel.
 */
export function RatingsAndTestimonials() {
  const { home, common } = useContent();
  const ratings = home.ratings.items;
  const items = common.testimonials.items;

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const cards = Array.from(node.children) as HTMLElement[];
        let closest = 0;
        let best = Infinity;
        cards.forEach((card, index) => {
          const distance = Math.abs(card.offsetLeft - node.offsetLeft - node.scrollLeft);
          if (distance < best) {
            best = distance;
            closest = index;
          }
        });
        setActive(closest);
      });
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const node = scroller.current;
    if (!node) return;
    const card = node.children[index] as HTMLElement | undefined;
    if (!card) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({
      left: card.offsetLeft - node.offsetLeft,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <section className="bg-linen px-6 py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[84rem]">
        <div className="text-center">
          <p className="label-caps text-stone">{common.testimonials.eyebrow}</p>
          <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.75rem)] font-medium text-ink">
            {common.testimonials.title}
          </h2>
        </div>

        {/* Compact aggregate scores */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12">
          {ratings.map((rating, index) => (
            <Reveal key={rating.label} delay={index * 120}>
              <figure className="flex items-center gap-4">
                <EnsoFrame className="h-14 w-14">
                  <span className="font-display text-lg text-ink">{rating.score}</span>
                </EnsoFrame>
                <figcaption className="text-left">
                  <p className="text-sm font-semibold text-ink">{rating.label}</p>
                  <p className="mt-0.5 text-xs text-stone">{rating.note}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {items.length > 0 && (
          <>
            <div
              ref={scroller}
              className="mt-11 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) => (
                <article
                  key={`${item.name}-${item.quote.slice(0, 16)}`}
                  className="flex w-full shrink-0 snap-start flex-col rounded-md border border-border bg-warm-white p-7 sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
                >
                  <p className="text-[0.85rem] font-semibold text-sage-deep">{item.source}</p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">“{item.quote}”</p>
                  <div className="mt-auto flex items-center gap-3 border-t border-border pt-5">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sm font-semibold text-warm-white"
                    >
                      {item.name.slice(0, 1)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{item.name}</span>
                      <span className="block text-xs text-stone">{item.country}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-6">
              <CarouselButton
                label={common.testimonials.prev}
                onClick={() => scrollToCard(Math.max(0, active - 1))}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </CarouselButton>
              <div className="flex items-center gap-2">
                {items.map((item, index) => (
                  <button
                    key={`dot-${item.name}-${index}`}
                    type="button"
                    aria-label={`${index + 1}`}
                    onClick={() => scrollToCard(index)}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      index === active ? "bg-clay" : "bg-border",
                    )}
                  />
                ))}
              </div>
              <CarouselButton
                label={common.testimonials.next}
                onClick={() => scrollToCard(Math.min(items.length - 1, active + 1))}
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </CarouselButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-warm-white text-stone transition-colors hover:border-clay hover:text-ink"
    >
      {children}
    </button>
  );
}
