import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocaleLink } from "@/components/site/LocaleLink";
import { footerNav } from "@/data/nav";
import { contact } from "@/data/contact";
import { localeFromPath } from "@/lib/locale";

export function SiteFooter() {
  const { i18n } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const t = i18n.getFixedT(localeFromPath(pathname));
  const links = footerNav(t("site.nav.home"));

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[84rem] px-6 py-14 lg:px-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <LocaleLink
              to="/"
              className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-foreground"
            >
              {t("site.brand")}
            </LocaleLink>
          </div>

          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t("site.labels.contacts")}
            </h2>
            <address className="mt-4 space-y-1 text-sm not-italic text-foreground/85">
              {contact.address ? <p>{contact.address}</p> : null}
              {contact.phones.map((phone) => (
                <p key={phone}>
                  <a className="hover:underline" href={`tel:${phone.replace(/\s/g, "")}`}>
                    {phone}
                  </a>
                </p>
              ))}
              {contact.email ? (
                <p>
                  <a className="hover:underline" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </p>
              ) : null}
            </address>
          </div>

          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t("site.labels.site")}
            </h2>
            <nav aria-label="Footer" className="mt-4 flex flex-col gap-2 text-sm">
              {links.map((item) => (
                <LocaleLink
                  key={item.to}
                  to={item.to}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </LocaleLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {t("site.brand")}. {t("site.footer.rights")}
          </p>
          <nav aria-label="Secondary" className="flex items-center gap-5">
            <a href="/admin" className="hover:text-foreground">
              {t("site.nav.admin")}
            </a>
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
    </footer>
  );
}
