import heroImageAsset from "@/assets/hero-telsiai-lake.jpg.asset.json";
const heroImage = heroImageAsset.url;
import heroImageWebpAsset from "@/assets/hero-telsiai-lake.webp.asset.json";
const heroImageWebp = heroImageWebpAsset.url;
import { SearchBar } from "@/components/search/SearchBar";
import { Enso } from "@/components/site/Enso";
import { useContent } from "@/content";
import { AVAILABILITY_SECTION_ID } from "@/lib/scroll-to";

/**
 * Home V2 hero: the booking search is the first thing a visitor sees —
 * no scrolling, no category step before results.
 */
export function HeroV2() {
  const { common, home } = useContent();

  return (
    <section id="top" className="relative isolate overflow-hidden bg-ink pb-20 lg:pb-28">
      <picture>
        <source srcSet={heroImageWebp} type="image/webp" />
        <img
          src={heroImage}
          alt={home.hero.imageAlt}
          width={2560}
          height={1440}
          fetchPriority="high"
          decoding="async"
          className="hero-kenburns absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/35 to-ink/70" />

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-6 pt-36 text-center lg:px-12">
        <Enso className="h-12 w-12 animate-[spin_22s_linear_infinite] text-warm-white/55" />
        <p className="label-caps mt-8 text-warm-white/80">{common.search.eyebrow}</p>
        <h1 className="mt-5 font-display text-[clamp(2.75rem,6.5vw,4rem)] leading-[1.06] font-normal text-warm-white">
          {common.search.title}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-warm-white/85 sm:text-lg">
          {common.search.lead}
        </p>

        <div id={AVAILABILITY_SECTION_ID} className="w-full scroll-mt-28">
          <SearchBar className="mx-auto mt-12 w-full max-w-3xl" />
        </div>
      </div>
    </section>
  );
}
