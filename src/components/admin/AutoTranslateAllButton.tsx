import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { autoTranslateAll } from "@/lib/auto-translate.functions";
import { translationLanguagesFor } from "@/lib/languages";
import { useDefaultLanguage } from "@/hooks/useDefaultLanguage";

/** Išverčia visų objektų ir turinio šablonų trūkstamus vertimus. */
export function AutoTranslateAllButton() {
  const { t } = useTranslation();
  const run = useServerFn(autoTranslateAll);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const defaultLang = useDefaultLanguage();
  const target = translationLanguagesFor(defaultLang)[0]?.code;

  const m = useMutation({
    mutationFn: () => run({ data: { toLang: target!, overwrite: false } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["translations"] });
      toast.success(
        t("translations.bulk.done", {
          translated: r.translated,
          skipped: r.skipped,
          failed: r.failed,
        }),
      );
      if (r.errors.length > 0) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
    onSettled: () => setOpen(false),
  });

  if (!target) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={m.isPending}>
        {m.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {t("translations.bulk.button", { lang: target.toUpperCase() })}
        </span>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("translations.bulk.confirmTitle", { lang: target.toUpperCase() })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("translations.bulk.confirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={m.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); m.mutate(); }} disabled={m.isPending}>
              {m.isPending ? t("translations.bulk.running") : t("translations.bulk.start")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
