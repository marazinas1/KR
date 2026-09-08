import { useTranslation } from "react-i18next";

import { LocaleLink } from "@/components/site/LocaleLink";
import { StatusPill, formatDate, vacancyState } from "@/components/public/StatusPill";
import type { Vacancy } from "@/lib/public-vacancies.functions";
import type { Locale } from "@/lib/locale";

function money(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "lt-LT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** The dark "board" panel — one deliberate dark surface, reused, not a theme. */
export function VacancyBoard({
  items,
  locale,
  limit,
  footer,
}: {
  items: Vacancy[];
  locale: Locale;
  limit?: number;
  footer?: string;
}) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const rows = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <div className="overflow-hidden rounded-md bg-board text-board-foreground">
      <div className="flex items-center justify-between border-b border-board-foreground/10 px-5 py-4">
        <span className="text-sm text-board-foreground/60">{t("public.board.title")}</span>
        <span className="inline-flex items-center gap-2 text-xs text-board-foreground/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-available" aria-hidden />
          {t("public.board.live")}
        </span>
      </div>

      <div className="hidden grid-cols-[64px_1.6fr_1fr_.9fr_1.3fr] gap-0 border-b border-board-foreground/[0.06] px-5 pb-2 pt-2.5 text-[11px] text-board-foreground/45 sm:grid">
        <span>{t("public.board.code")}</span>
        <span>{t("public.board.location")}</span>
        <span>{t("public.board.type")}</span>
        <span>{t("public.board.rent")}</span>
        <span>{t("public.board.state")}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-board-foreground/60">{t("public.board.empty")}</p>
      ) : (
        rows.map((v) => (
          <LocaleLink
            key={v.id}
            to={`/butai/${v.id}`}
            className="grid grid-cols-1 items-center gap-y-1.5 border-b border-board-foreground/[0.06] px-5 py-4 text-sm last:border-b-0 transition-colors hover:bg-board-foreground/[0.04] sm:grid-cols-[64px_1.6fr_1fr_.9fr_1.3fr] sm:gap-y-0"
          >
            <span className="font-mono text-xs text-board-foreground/60 sm:text-[13px] sm:text-board-foreground/90">
              {v.unit_number || "—"}
            </span>
            <span>
              {v.name}
              <small className="mt-0.5 block text-xs text-board-foreground/50">
                {[v.building_name, v.city].filter(Boolean).join(" · ")}
              </small>
            </span>
            <span className="text-board-foreground/75">
              {t("public.rooms", { count: v.room_count })}
              {v.area_m2 ? ` · ${v.area_m2} m²` : ""}
            </span>
            <span className="font-mono">{money(v.monthly_rent, locale)}</span>
            <span>
              <StatusPill
                state={vacancyState(v)}
                date={v.available_from}
                locale={locale}
                tone="board"
              />
            </span>
          </LocaleLink>
        ))
      )}

      <div className="border-t border-board-foreground/10 px-5 py-3.5 text-xs text-board-foreground/45">
        {footer ?? t("public.board.footer", { count: items.length })}
      </div>
    </div>
  );
}

export { money, formatDate };
