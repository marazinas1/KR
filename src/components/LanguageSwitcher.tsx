import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import i18n, { SUPPORTED_LANGUAGES, storeLanguage, type LanguageCode } from "@/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n: inst } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === inst.language);

  const pick = (code: LanguageCode) => {
    storeLanguage(code);
    void i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          }
        >
          <Languages className="h-4 w-4" />
          {current ? t(current.labelKey) : t("language.label")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => pick(l.code)}
            className={l.code === inst.language ? "font-medium" : undefined}
          >
            {t(l.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
