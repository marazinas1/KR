import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { InquiryForm } from "@/components/public/InquiryForm";
import { StatusPill, formatDate, vacancyState } from "@/components/public/StatusPill";
import { UnitGallery } from "@/components/public/UnitGallery";
import { money } from "@/components/public/VacancyBoard";
import { LocaleLink } from "@/components/site/LocaleLink";
import { vacancyQuery } from "@/lib/public-queries";
import type { Locale } from "@/lib/locale";

export function VacancyDetailPage({ id, locale }: { id: string; locale: Locale }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const { data: unit } = useSuspenseQuery(vacancyQuery(id));

  if (!unit) {
    return (
      <section className="mx-auto max-w-[84rem] px-6 py-24 lg:px-12">
        <h1 className="text-3xl font-semibold">{t("public.detail.goneTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("public.detail.goneText")}</p>
        <LocaleLink to="/butai" className="mt-6 inline-block underline underline-offset-4">
          {t("public.detail.backToList")}
        </LocaleLink>
      </section>
    );
  }

  const images = [unit.cover_image_url, ...unit.image_urls].filter(Boolean);
  const facts: Array<[string, string]> = [
    [t("public.detail.rent"), money(unit.monthly_rent, locale)],
    [t("public.detail.deposit"), unit.deposit ? money(unit.deposit, locale) : "—"],
    [t("public.detail.rooms"), String(unit.room_count)],
    [t("public.detail.area"), unit.area_m2 ? `${unit.area_m2} m²` : "—"],
    [t("public.detail.floor"), unit.floor === null ? "—" : String(unit.floor)],
    [
      t("public.detail.available"),
      unit.vacant_now ? t("public.availableNow") : formatDate(unit.available_from, locale),
    ],
  ];

  return (
    <section className="mx-auto max-w-[84rem] px-6 py-12 lg:px-12">
      <LocaleLink to="/butai" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t("public.detail.backToList")}
      </LocaleLink>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold lg:text-4xl">{unit.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {[unit.building_name, unit.address, unit.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusPill state={vacancyState(unit)} date={unit.available_from} locale={locale} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <UnitGallery images={images} alt={unit.name} />

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-sm">{value}</dd>
              </div>
            ))}
          </dl>

          {unit.description ? (
            <p className="mt-8 whitespace-pre-line leading-relaxed text-foreground/85">
              {unit.description}
            </p>
          ) : null}

          {unit.amenities.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {unit.amenities.map((a) => (
                <li
                  key={a}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {a}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <InquiryForm unitId={unit.id} locale={locale} />
      </div>
    </section>
  );
}
