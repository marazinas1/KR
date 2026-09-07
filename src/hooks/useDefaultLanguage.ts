import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { resolveDefaultLanguage } from "@/lib/languages";
import i18n, { readStoredLanguage } from "@/i18n";

/**
 * Grąžina objekto numatytąją kalbą iš nustatymų ir pritaiko ją sąsajai,
 * jei vartotojas kalbos niekada sąmoningai nesirinko.
 */
export function useDefaultLanguage() {
  const fetchSettings = useServerFn(getPropertySettings);
  const { data } = useQuery({
    queryKey: ["property-settings"],
    queryFn: () => fetchSettings(),
  });
  const defaultLang = resolveDefaultLanguage(data?.settings.defaultLanguage);

  useEffect(() => {
    if (readStoredLanguage()) return; // vartotojas pasirinko pats — negriauname
    if (defaultLang !== i18n.language) void i18n.changeLanguage(defaultLang);
  }, [defaultLang]);

  return defaultLang;
}
