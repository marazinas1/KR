import { useState } from "react";

/** Plain image carousel — no external data, no availability logic. */
export function UnitGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-border bg-muted">
        <img
          src={current}
          alt={alt}
          width={1200}
          height={800}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} ${i + 1}`}
              aria-current={i === active}
              className="h-16 w-24 overflow-hidden rounded-sm border border-border data-[active=true]:border-foreground"
              data-active={i === active}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
