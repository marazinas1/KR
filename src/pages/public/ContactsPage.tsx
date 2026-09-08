import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { InquiryForm } from "@/components/public/InquiryForm";
import { publicOrgQuery } from "@/lib/public-queries";
import type { Locale } from "@/lib/locale";

export function ContactsPage({ locale }: { locale: Locale }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const { data: org } = useSuspenseQuery(publicOrgQuery);

  return (
    <section className="mx-auto max-w-[84rem] px-6 py-14 lg:px-12">
      <h1 className="text-3xl font-semibold lg:text-4xl">{t("public.contacts.title")}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("public.contacts.lead")}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <address className="space-y-3 text-sm not-italic">
          {org.phone ? (
            <p>
              <span className="block text-xs text-muted-foreground">
                {t("public.contacts.phone")}
              </span>
              <a className="hover:underline" href={`tel:${org.phone.replace(/\s/g, "")}`}>
                {org.phone}
              </a>
            </p>
          ) : null}
          {org.email ? (
            <p>
              <span className="block text-xs text-muted-foreground">
                {t("public.contacts.email")}
              </span>
              <a className="hover:underline" href={`mailto:${org.email}`}>
                {org.email}
              </a>
            </p>
          ) : null}
          {org.address || org.city ? (
            <p>
              <span className="block text-xs text-muted-foreground">
                {t("public.contacts.address")}
              </span>
              {[org.address, org.city].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </address>

        <InquiryForm locale={locale} />
      </div>
    </section>
  );
}
