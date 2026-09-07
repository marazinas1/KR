import { useRouterState, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { LocaleLink } from "@/components/site/LocaleLink";
import { Reveal } from "@/components/site/Reveal";
import { localeFromPath } from "@/lib/locale";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: LinkProps["to"] };

/** Shared inner-page header for the public surface. */
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
  const { i18n } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const t = i18n.getFixedT(localeFromPath(pathname));
  const hasImage = Boolean(image);

  return (
    <section
      className={cn("relative isolate overflow-hidden", hasImage ? "bg-foreground" : "bg-muted")}
    >
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
          <div className="absolute inset-0 bg-black/45" />
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
          {eyebrow ? (
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-[0.14em]",
                hasImage ? "text-white/75" : "text-muted-foreground",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "mt-4 text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.12]",
              hasImage ? "text-white" : "text-foreground",
            )}
          >
            {title}
          </h1>
          {lead ? (
            <p
              className={cn(
                "mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
                hasImage ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {lead}
            </p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
          {crumbs?.length ? (
            <nav
              aria-label={t("site.labels.breadcrumb")}
              className={cn(
                "mt-8 flex flex-wrap items-center justify-center gap-2 text-xs",
                hasImage ? "text-white/70" : "text-muted-foreground",
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
