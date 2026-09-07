import { Link, useNavigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import { type ComponentPropsWithoutRef } from "react";

import { localeFromPath, localizePath, type Locale } from "@/lib/locale";

type AnchorProps = Omit<ComponentPropsWithoutRef<"a">, "href">;

export type LocaleLinkProps = AnchorProps &
  Omit<LinkProps, "to" | "search" | "params"> & {
    /** Canonical Lithuanian path. */
    to: string;
    locale?: Locale;
    /** Loose by design: routes are registered generically, so search/params stay untyped. */
    search?: Record<string, unknown> | true;
    params?: Record<string, unknown> | true;
  };

function useCurrentLocale(): Locale {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return localeFromPath(pathname);
}

/** <Link> that keeps the visitor inside the current locale segment. */
export function LocaleLink({ to, locale, ...rest }: LocaleLinkProps) {
  const current = useCurrentLocale();
  const target = localizePath(to, locale ?? current);
  const props = { ...rest, to: target } as unknown as LinkProps;
  return <Link {...props} />;
}

/** Programmatic navigation that stays inside the current locale. */
export function useLocaleNavigate() {
  const navigate = useNavigate();
  const locale = useCurrentLocale();
  return (options: Omit<Parameters<typeof navigate>[0], "to"> & { to: string }) =>
    navigate({
      ...options,
      to: localizePath(options.to, locale),
    } as Parameters<typeof navigate>[0]);
}
