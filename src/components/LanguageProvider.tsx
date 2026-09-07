import { useEffect } from "react";
import i18n, { readStoredLanguage } from "@/i18n";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = readStoredLanguage();
    if (saved && saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }
  }, []);

  return <>{children}</>;
}
