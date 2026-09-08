import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/locale";

export type VacancyState = "available" | "soon" | "occupied";

export function vacancyState(v: { vacant_now: boolean; available_from: string | null }): VacancyState {
  if (v.vacant_now) return "available";
  return v.available_from ? "soon" : "occupied";
}

export function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "lt-LT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** The only place availability colours are used. Never decorative. */
export function StatusPill({
  state,
  date,
  locale,
  tone = "light",
  className,
}: {
  state: VacancyState;
  date?: string | null;
  locale: Locale;
  tone?: "light" | "board";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);

  const label =
    state === "available"
      ? t("public.status.available")
      : state === "soon"
        ? t("public.status.soon", { date: formatDate(date ?? null, locale) })
        : t("public.status.occupied");

  const light: Record<VacancyState, string> = {
    available: "bg-available-bg text-available",
    soon: "bg-soon-bg text-soon",
    occupied: "bg-occupied-bg text-occupied",
  };
  const board: Record<VacancyState, string> = {
    available: "bg-available/20 text-available-bg",
    soon: "bg-soon/20 text-soon-bg",
    occupied: "bg-board-foreground/10 text-board-foreground/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs",
        tone === "board" ? board[state] : light[state],
        className,
      )}
    >
      {label}
    </span>
  );
}
