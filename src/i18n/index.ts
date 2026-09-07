import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import lt from "./locales/lt.json";
import en from "./locales/en.json";
import {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  type LanguageCode,
} from "@/lib/languages";

export {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  type LanguageCode,
};

/**
 * Vartotojo SĄMONINGAI pasirinkta kalba, arba `null`, jei jis nieko nesirinko.
 * `null` reiškia, kad reikia taikyti objekto numatytąją kalbą iš nustatymų.
 */
export function readStoredLanguage(): LanguageCode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function storeLanguage(code: LanguageCode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // localStorage gali būti išjungtas — kalba tiesiog neišliks, bet programa veiks
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      lt: { translation: lt },
      en: { translation: en },
    },
    // Serveris nustatymų dar nežino, tad startuojame nuo atsarginės kalbos;
    // tikroji numatytoji pritaikoma naršyklėje.
    lng: FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
