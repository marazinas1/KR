import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import locationImageAsset from "@/assets/location-telsiai-aerial.jpg.asset.json";
const locationImage = locationImageAsset.url;
import locationImageWebpAsset from "@/assets/location-telsiai-aerial.webp.asset.json";
const locationImageWebp = locationImageWebpAsset.url;
import { EnsoDivider } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";
import { contact } from "@/data/contact";

const LocationMap = lazy(() => import("@/components/home/LocationMap"));

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

export function LocationSection() {
  const { common, home } = useContent();
  return (
    <section id="vieta" className="scroll-mt-24 overflow-x-clip bg-warm-white px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[84rem]">
        <EnsoDivider className="mb-16" />

        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal direction="left">
            <p className="label-caps text-sage">{home.location.eyebrow}</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,2.625rem)] leading-tight font-medium text-ink">
              {home.location.title}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-[1.75] text-stone sm:text-lg">
              {home.location.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 flex items-start gap-3 text-sm text-stone">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden />
              <span>{contact.address}</span>
            </div>
            <a
              href={contact.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-md border border-sage px-6 py-3 text-sm font-medium text-sage transition-colors hover:bg-sage hover:text-warm-white"
            >
              {common.cta.openMap}
            </a>
          </Reveal>

          <Reveal delay={120} direction="right">
            <div className="group overflow-hidden rounded-md shadow-soft">
              <picture>
                <source srcSet={locationImageWebp} type="image/webp" />
                <img
                  src={locationImage}
                  alt={home.location.imageAlt}
                  loading="lazy"
                  decoding="async"
                  width={1400}
                  height={1050}
                  className="photo-zoom h-full w-full object-cover"
                />
              </picture>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-16">
          <div className="h-[360px] overflow-hidden rounded-md shadow-soft [filter:grayscale(1)_contrast(0.95)] lg:h-[500px]">
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <LocationMap />
              </Suspense>
            </ClientOnly>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
