import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Logo } from "@/components/site/Logo";
import { useContent, useLocale } from "@/content";
import { mainNav, type NavEntry, type NavLink } from "@/data/nav";
import { localizePath } from "@/lib/locale";
import { AVAILABILITY_SECTION_ID, scrollToId } from "@/lib/scroll-to";
import { cn } from "@/lib/utils";

function isGroup(entry: NavEntry): entry is { label: string; items: NavLink[] } {
  return "items" in entry;
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const locale = useLocale();
  const content = useContent();
  const common = content.common;
  const nav = mainNav(locale);
  const homePath = localizePath("/", locale);
  const isHeroPage = pathname === homePath;

  // The header CTA leads to the shared availability calendar on the home page.
  const goToAvailability = () => {
    if (pathname === homePath) {
      scrollToId(AVAILABILITY_SECTION_ID);
      return;
    }
    void navigate({ to: homePath, hash: AVAILABILITY_SECTION_ID }).then(() => {
      window.setTimeout(() => scrollToId(AVAILABILITY_SECTION_ID), 80);
    });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close every menu after a route change.
  useEffect(() => {
    setMenuOpen(false);
    setOpenGroup(null);
    setMobileGroup(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    const onClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const solid = scrolled || menuOpen || !isHeroPage;
  const linkTone = solid ? "text-stone hover:text-sage" : "text-warm-white/85 hover:text-warm-white";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        solid ? "border-b border-border/70 bg-linen/95 backdrop-blur-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto grid max-w-[84rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-2 lg:px-12 lg:py-3">
        <LocaleLink
          to="/"
          aria-label={`${common.brand} — ${common.nav.home}`}
          onClick={() => {
            if (pathname !== homePath) return;
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          }}
          className={cn(
            "inline-flex items-center transition-colors",
            solid ? "text-ink" : "text-warm-white",
          )}
        >
          <Logo className="h-24 w-24" />
        </LocaleLink>

        <div ref={navRef} className="flex items-center gap-6">
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {nav.map((entry) =>
              isGroup(entry) ? (
                <div
                  key={entry.label}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(entry.label)}
                  onMouseLeave={() => setOpenGroup((value) => (value === entry.label ? null : value))}
                >
                  <button
                    type="button"
                    aria-expanded={openGroup === entry.label}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenGroup((value) => (value === entry.label ? null : entry.label))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium transition-colors",
                      linkTone,
                    )}
                  >
                    {entry.label}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {openGroup === entry.label ? (
                    <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3">
                      <ul className="overflow-hidden rounded-md border border-border bg-warm-white py-2 shadow-lift">
                        {entry.items.map((item) => (
                          <li key={item.to}>
                            <LocaleLink
                              to={item.to}
                              activeProps={{ className: "text-sage" }}
                              className="block px-5 py-2.5 text-sm text-stone transition-colors hover:bg-linen hover:text-sage"
                            >
                              {item.label}
                            </LocaleLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <LocaleLink
                  key={entry.to}
                  to={entry.to}
                  activeProps={{ className: solid ? "text-sage" : "text-warm-white" }}
                  className={cn("text-sm font-medium transition-colors", linkTone)}
                >
                  {entry.label}
                </LocaleLink>
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={goToAvailability}
            className={cn(
              "hidden rounded-md px-5 py-2.5 text-sm font-medium transition-colors lg:inline-flex",
              solid
                ? "bg-sage text-warm-white hover:bg-sage-deep"
                : "border border-warm-white/70 text-warm-white hover:bg-warm-white hover:text-ink",
            )}
          >
            {common.cta.checkDates}
          </button>

          <LanguageSwitcher
            className={cn("hidden lg:flex", solid ? "text-stone" : "text-warm-white/85")}
            tone={solid ? "dark" : "light"}
          />

          <LanguageSwitcher
            className={cn("flex text-sm lg:hidden", solid ? "text-stone" : "text-warm-white/85")}
            tone={solid ? "dark" : "light"}
          />

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Menu"
            className={cn("lg:hidden", solid ? "text-ink" : "text-warm-white")}
          >
            {menuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="max-h-[80vh] overflow-y-auto border-t border-border/70 bg-linen px-6 pb-8 pt-2 lg:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {nav.map((entry) =>
              isGroup(entry) ? (
                <div key={entry.label} className="border-b border-border/60">
                  <button
                    type="button"
                    aria-expanded={mobileGroup === entry.label}
                    onClick={() =>
                      setMobileGroup((value) => (value === entry.label ? null : entry.label))
                    }
                    className="flex w-full items-center justify-between py-4 text-base font-medium text-ink"
                  >
                    {entry.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        mobileGroup === entry.label && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {mobileGroup === entry.label ? (
                    <ul className="pb-3 pl-4">
                      {entry.items.map((item) => (
                        <li key={item.to}>
                          <LocaleLink
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className="block py-2.5 text-sm text-stone"
                          >
                            {item.label}
                          </LocaleLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <LocaleLink
                  key={entry.to}
                  to={entry.to}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/60 py-4 text-base font-medium text-ink"
                >
                  {entry.label}
                </LocaleLink>
              ),
            )}
          </nav>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              goToAvailability();
            }}
            className="mt-6 w-full rounded-md bg-sage px-5 py-3.5 text-sm font-medium text-warm-white"
          >
            {common.cta.checkDates}
          </button>
        </div>
      ) : null}
    </header>
  );
}
