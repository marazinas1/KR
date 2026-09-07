/** Vienintelė vieta, kur registruojamos palaikomos kalbos. */
export const SUPPORTED_LANGUAGES = [
  { code: "lt", labelKey: "language.lt" },
  { code: "en", labelKey: "language.en" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/**
 * Atsarginė kalba — naudojama TIK tada, kai nustatymai dar neužsikrovę arba
 * neprieinami (SSR, i18next inicializacija, neprisijungęs vartotojas).
 *
 * TIKROJI numatytoji kalba imama iš Nustatymai → Objekto informacija →
 * „Numatytoji kalba" (`property_settings.default_language`).
 */
export const FALLBACK_LANGUAGE: LanguageCode = "lt";

export const LANGUAGE_STORAGE_KEY = "revoo.lang";

export function isSupportedLanguage(v: unknown): v is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === v);
}

/**
 * Kalbos, į kurias verčiama = visos palaikomos, išskyrus numatytąją.
 * Numatytąja kalba duomenys saugomi pačiose lentelėse, tad ji ir yra originalas.
 */
export function translationLanguagesFor(defaultLang: string) {
  return SUPPORTED_LANGUAGES.filter((l) => l.code !== defaultLang);
}

/** Saugiai paverčia nustatymų reikšmę kalbos kodu. */
export function resolveDefaultLanguage(settingsValue: unknown): LanguageCode {
  return isSupportedLanguage(settingsValue) ? settingsValue : FALLBACK_LANGUAGE;
}
