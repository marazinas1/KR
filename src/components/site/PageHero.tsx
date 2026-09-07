import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Enso } from "@/components/site/Enso";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: LinkProps["to"] };

/**
 * Shared inner-page header: the calm sibling of the home hero. Without an
 * image it is a linen band; with one it becomes a short photo banner using the
 * same warm gradient as the hero (no Ken Burns — that stays unique to home).
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  imageWebp,
  imageAlt,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  image?: string;
  imageWebp?: string;
  imageAlt?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  const { common } = useContent();
  const hasImage = Boolean(image);

  return (
    <section className={cn("relative isolate overflow-hidden", hasImage ? "bg-ink" : "bg-linen")}>
      {hasImage ? (
        <>
          <picture>
            {imageWebp ? <source srcSet={imageWebp} type="image/webp" /> : null}
            <img
              src={image}
              alt={imageAlt ?? ""}
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/65" />
        </>
      ) : null}

      <div
        className={cn(
          "relative mx-auto flex max-w-[84rem] flex-col items-center px-6 text-center lg:px-12",
          hasImage
            ? "min-h-[420px] justify-end pb-16 pt-40 lg:min-h-[520px] lg:pb-20"
            : "min-h-[280px] justify-center py-20 pt-32 lg:min-h-[340px] lg:py-24 lg:pt-36",
        )}
      >
        <Reveal>
          <Enso
            className={cn("mx-auto h-9 w-9", hasImage ? "text-warm-white/60" : "text-sage/70")}
          />
          {eyebrow ? (
            <p className={cn("label-caps mt-6", hasImage ? "text-warm-white/75" : "text-sage")}>
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "mt-4 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.12] font-medium",
              hasImage ? "text-warm-white" : "text-ink",
            )}
          >
            {title}
          </h1>
          {lead ? (
            <p
              className={cn(
                "mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
                hasImage ? "text-warm-white/85" : "text-stone",
              )}
            >
              {lead}
            </p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
          {crumbs?.length ? (
            <nav
              aria-label={common.labels.breadcrumb}
              className={cn(
                "mt-8 flex flex-wrap items-center justify-center gap-2 text-xs",
                hasImage ? "text-warm-white/70" : "text-stone/80",
              )}
            >
              {crumbs.map((crumb, index) => (
                <span key={crumb.label} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden>·</span> : null}
                  {crumb.to ? (
                    <LocaleLink to={crumb.to} className="hover:underline">
                      {crumb.label}
                    </LocaleLink>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}