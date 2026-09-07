import { MapPin } from "lucide-react";

import { Enso } from "@/components/site/Enso";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Logo } from "@/components/site/Logo";
import { useContent, useLocale } from "@/content";
import { footerNav } from "@/data/nav";
import { contact } from "@/data/contact";

export function SiteFooter() {
  const locale = useLocale();
  const { common, legal } = useContent();
  const links = footerNav(locale);
  return (
    <footer id="kontaktai" className="bg-sage-deep text-warm-white">
      <div className="mx-auto max-w-[84rem] px-6 py-20 lg:px-12">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <Enso className="h-9 w-9 text-warm-white/60" />
            <LocaleLink to="/" aria-label={common.brand} className="mt-5 inline-flex">
              <Logo className="h-24 w-24 text-warm-white" />
            </LocaleLink>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-warm-white/70">
              {common.footer.intro}
            </p>
          </div>

          <div>
            <h2 className="label-caps font-sans text-warm-white/60">{common.labels.contacts}</h2>
            <address className="mt-5 space-y-2 text-sm not-italic text-warm-white/85">
              <p>{contact.address}</p>
              {contact.phones.map((phone) => (
                <p key={phone}>
                  <a className="hover:text-warm-white" href={`tel:${phone.replace(/\s/g, "")}`}>
                    {phone}
                  </a>
                </p>
              ))}
              <p>
                <a className="hover:text-warm-white" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </p>
            </address>
            <a
              href={contact.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-warm-white/85 hover:text-warm-white"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {common.cta.openMap}
            </a>
          </div>

          <div>
            <h2 className="label-caps font-sans text-warm-white/60">{common.nav.site}</h2>
            <nav aria-label="Footer" className="mt-5 flex flex-col gap-2 text-sm">
              {links.map((item) => (
                <LocaleLink
                  key={item.to}
                  to={item.to}
                  className="text-warm-white/85 hover:text-warm-white"
                >
                  {item.label}
                </LocaleLink>
              ))}
            </nav>
          </div>

        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-warm-white/15 pt-6 text-xs text-warm-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {common.brand}. {common.footer.rights}
          </p>
          <nav aria-label="Legal" className="flex gap-5">
            <LocaleLink to="/taisykles" className="hover:text-warm-white">
              {legal.rental.title}
            </LocaleLink>
            <LocaleLink to="/privatumo-politika" className="hover:text-warm-white">
              {legal.privacy.title}
            </LocaleLink>
            <a href="/admin" className="hover:text-warm-white">
              Admin
            </a>
            <LanguageSwitcher tone="light" className="text-warm-white/70" />
          </nav>
        </div>
      </div>
    </footer>
  );
}