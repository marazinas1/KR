import { redirect } from "@tanstack/react-router";

import { localizePath, type Locale } from "@/lib/locale";

/** Legacy static stay URL — properties are dynamic now. 301 to the listing. */
export function redirectToStaysRoute(locale: Locale) {
  return {
    beforeLoad: () => {
      throw redirect({ to: localizePath("/apartamentai", locale) as never, statusCode: 301 });
    },
  };
}
