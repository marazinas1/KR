import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { StatusPill, formatDate, vacancyState } from "@/components/public/StatusPill";
import { VacancyBoard, money } from "@/components/public/VacancyBoard";
import { LocaleLink } from "@/components/site/LocaleLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { vacanciesQuery } from "@/lib/public-queries";
import type { Locale } from "@/lib/locale";

type Filter = "all" | "available" | "soon";

export function VacanciesPage({ locale }: { locale: Locale }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const { data: vacancies } = useSuspenseQuery(vacanciesQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return vacancies.filter((v) => {
      const state = vacancyState(v);
      if (filter !== "all" && state !== filter) return false;
      if (!needle) return true;
      return [v.name, v.unit_number, v.city, v.address, v.building_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [vacancies, filter, q]);

  return (
    <section className="mx-auto max-w-[84rem] px-6 py-14 lg:px-12">
      <h1 className="text-3xl font-semibold lg:text-4xl">{t("public.list.title")}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("public.list.lead")}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("public.list.search")}
          className="h-11 sm:max-w-xs"
          aria-label={t("public.list.search")}
        />
        <div className="flex gap-2">
          {(["all", "available", "soon"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              variant={filter === key ? "default" : "outline"}
              className="h-11"
              onClick={() => setFilter(key)}
            >
              {t(`public.list.filter.${key}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-8 lg:hidden">
        <VacancyBoard items={rows} locale={locale} />
      </div>

      <div className="mt-8 hidden gap-6 lg:grid lg:grid-cols-3">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("public.board.empty")}</p>
        ) : (
          rows.map((v) => (
            <LocaleLink
              key={v.id}
              to={`/butai/${v.id}`}
              className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-lift"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {v.cover_image_url ? (
                  <img
                    src={v.cover_image_url}
                    alt={v.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold">{v.name}</h2>
                  <StatusPill state={vacancyState(v)} date={v.available_from} locale={locale} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[v.building_name, v.city].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("public.rooms", { count: v.room_count })}
                  {v.area_m2 ? ` · ${v.area_m2} m²` : ""}
                  {v.floor !== null ? ` · ${t("public.floorShort", { floor: v.floor })}` : ""}
                </p>
                <div className="mt-auto flex items-end justify-between pt-5">
                  <span className="font-mono text-lg">{money(v.monthly_rent, locale)}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.vacant_now
                      ? t("public.availableNow")
                      : t("public.availableFrom", {
                          date: formatDate(v.available_from, locale),
                        })}
                  </span>
                </div>
              </div>
            </LocaleLink>
          ))
        )}
      </div>
    </section>
  );
}
