import { Flame, Gift, UtensilsCrossed, Waves } from "lucide-react";

import { EnsoFrame } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

// Icons stay in code, in the same order as home.extras.items (restobar/sauna/tub/vouchers).
const EXTRA_ICONS = [UtensilsCrossed, Flame, Waves, Gift];

export function ExtrasSection() {
  const { home } = useContent();
  const extras = home.extras.items.map((item, index) => ({
    ...item,
    icon: EXTRA_ICONS[index],
  }));

  return (
    <section id="papildoma" className="scroll-mt-24 bg-linen px-6 py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[84rem]">
        <p className="label-caps text-stone">{home.extras.eyebrow}</p>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {extras.map((extra, index) => (
            <Reveal key={extra.key} delay={index * 90}>
              <div>
                <EnsoFrame className="h-[4.5rem] w-[4.5rem]">
                  {extra.icon ? (
                    <extra.icon className="h-7 w-7 text-sage-deep" strokeWidth={1.5} aria-hidden />
                  ) : null}
                </EnsoFrame>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{extra.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">{extra.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
