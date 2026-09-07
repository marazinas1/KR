import { useRouterState } from "@tanstack/react-router";

import { lt } from "./lt";
import { en } from "./en";
import { DEFAULT_LOCALE, localeFromPath, type Locale } from "@/lib/locale";

/** Mutable, widened mirror of the Lithuanian bundle — the contract every locale meets. */
export type Loose<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => R
        : T extends readonly (infer U)[]
          ? Loose<U>[]
          : { -readonly [K in keyof T]: Loose<T[K]> };

export type Bundle = Loose<typeof lt>;

const bundles: Record<Locale, Bundle> = { lt, en };

export function getContent(locale: Locale = DEFAULT_LOCALE): Bundle {
  return bundles[locale] ?? bundles[DEFAULT_LOCALE];
}

/** Locale of the current route (`/en/...` → en). */
export function useLocale(): Locale {
  return useRouterState({ select: (state) => localeFromPath(state.location.pathname) });
}

export function useContent(): Bundle {
  return getContent(useLocale());
}
