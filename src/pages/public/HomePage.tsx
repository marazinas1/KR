import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { VacancyBoard } from "@/components/public/VacancyBoard";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Button } from "@/components/ui/button";
import { publicOrgQuery, vacanciesQuery } from "@/lib/public-queries";
import type { Locale } from "@/lib/locale";

export function HomePage({ locale }: { locale: Locale }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const { data: vacancies } = useSuspenseQuery(vacanciesQuery);
  const { data: org } = useSuspenseQuery(publicOrgQuery);

  const freeNow = vacancies.filter((v) => v.vacant_now).length;
  const soon = vacancies.length - freeNow;

  return (
    <>
      <section className="mx-auto max-w-[84rem] px-6 pb-16 pt-16 lg:px-12 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {org.city || t("public.home.kicker")}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.08] font-semibold lg:text-5xl">
              {t("public.home.title")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              {t("public.home.lead")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-11 px-6">
                <LocaleLink to="/butai">{t("public.home.ctaList")}</LocaleLink>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6">
                <LocaleLink to="/kontaktai">{t("public.home.ctaContact")}</LocaleLink>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
              <div className="bg-card px-5 py-4">
                <dt className="text-xs text-muted-foreground">{t("public.home.statFree")}</dt>
                <dd className="mt-1 font-mono text-2xl">{freeNow}</dd>
              </div>
              <div className="bg-card px-5 py-4">
                <dt className="text-xs text-muted-foreground">{t("public.home.statSoon")}</dt>
                <dd className="mt-1 font-mono text-2xl">{soon}</dd>
              </div>
            </dl>
          </div>

          <VacancyBoard items={vacancies} locale={locale} limit={6} />
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-[84rem] gap-8 px-6 py-16 md:grid-cols-3 lg:px-12">
          {(["clear", "direct", "care"] as const).map((key) => (
            <div key={key}>
              <h2 className="text-base font-semibold">{t(`public.home.points.${key}.title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`public.home.points.${key}.text`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
