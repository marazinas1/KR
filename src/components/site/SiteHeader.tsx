import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocaleLink } from "@/components/site/LocaleLink";
import { mainNav } from "@/data/nav";
import { localeFromPath } from "@/lib/locale";
import { cn } from "@/lib/utils";

/**
 * Site chrome for the public surface. The wordmark is a neutral placeholder —
 * the real display name comes from org settings once that module exists.
 */
export function SiteHeader() {
  const { i18n } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locale = localeFromPath(pathname);
  // Fixed to the URL locale so SSR and client render identical text.
  const t = i18n.getFixedT(locale);
  const [scrolled, setScrolled] = useState(false);
  const links = mainNav(t("site.nav.home"));

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
        <LocaleLink
          to="/"
          className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-foreground"
        >
          {t("site.brand")}
        </LocaleLink>

        <nav aria-label="Main" className="flex items-center gap-6 text-sm">
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
