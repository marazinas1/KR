import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocaleLink } from "@/components/site/LocaleLink";
import { mainNav } from "@/data/nav";
import { publicOrgQuery } from "@/lib/public-queries";
import { localeFromPath } from "@/lib/locale";
import { cn } from "@/lib/utils";

/**
 * Site chrome for the public surface. The wordmark is the display name from
 * org settings — never hardcoded, so a clone only changes one setting.
 */
export function SiteHeader() {
  const { i18n } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locale = localeFromPath(pathname);
  // Fixed to the URL locale so SSR and client render identical text.
  const t = i18n.getFixedT(locale);
  const [scrolled, setScrolled] = useState(false);
  const { data: org } = useQuery(publicOrgQuery);
  const brand = org?.displayName || t("site.brand");
  const links = mainNav({
    home: t("site.nav.home"),
    units: t("site.nav.units"),
    contacts: t("site.nav.contacts"),
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors",
        scrolled ? "border-border bg-background/95 backdrop-blur" : "border-transparent bg-background",
      )}
      data-locale={locale}
    >
      <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-6 px-6 py-4 lg:px-12">
        <LocaleLink to="/" className="text-foreground">
          <BrandMark
            displayName={brand}
            tagline={org?.tagline}
            logoUrl={org?.logoUrl}
          />
        </LocaleLink>

        <nav aria-label="Main" className="flex items-center gap-4 text-sm sm:gap-6">
          {links.map((item) =>
            "to" in item ? (
              <LocaleLink
                key={item.to}
                to={item.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </LocaleLink>
            ) : null,
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
