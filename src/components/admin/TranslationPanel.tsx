import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DOMPurify from "dompurify";
import { RichTextEditor } from "@/components/admin/content/RichTextEditor";
import { VariablePicker } from "@/components/admin/content/VariablePicker";
import type { Editor } from "@tiptap/react";
import { translationLanguagesFor } from "@/lib/languages";
import { useDefaultLanguage } from "@/hooks/useDefaultLanguage";
import { getTranslations, saveTranslations } from "@/lib/translations.functions";
import { autoTranslateFields } from "@/lib/auto-translate.functions";
import type { TranslatableEntity, TranslatableFieldDef } from "@/lib/translations";

export function TranslationPanel({
  entityType,
  entityId,
  fields,
  originals,
  showVariables,
  hideOriginals,
}: {
  entityType: TranslatableEntity;
  entityId: string;
  fields: TranslatableFieldDef[];
  /** Originalo tekstai, rodomi šalia kaip nuoroda. */
  originals: Record<string, string>;
  /** Rodyti kintamųjų ({{...}}) įterpimo juostą po kiekvienu lauku. */
  showVariables?: boolean;
  /** Nerodyti užrakinto originalo teksto (naudojama Turinio šablonuose). */
  hideOriginals?: boolean;
}) {
  const { t } = useTranslation();
  const fetchTranslations = useServerFn(getTranslations);
  const save = useServerFn(saveTranslations);
  const autoTranslate = useServerFn(autoTranslateFields);
  const qc = useQueryClient();

  // Verčiamos visos kalbos, IŠSKYRUS objekto numatytąją.
  const defaultLang = useDefaultLanguage();
  const languages = translationLanguagesFor(defaultLang);

  const [activeLang, setActiveLang] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const editorsRef = useRef<Record<string, Editor | null>>({});
  const inputsRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Objekto formos „Išsaugoti" mygtukas išmeta iš puslapio — įspėjame.
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
  });

  const langKey = languages.map((l) => l.code).join(",");
  useEffect(() => {
    if (languages.length === 0) return;
    if (!languages.some((l) => l.code === activeLang)) {
      setActiveLang(languages[0]!.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langKey, activeLang]);

  const { data: translations, isLoading } = useQuery({
    queryKey: ["translations", entityType, entityId],
    queryFn: () => fetchTranslations({ data: { entityType, entityId } }),
  });

  const fieldKey = fields.map((f) => f.field).join("|");
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of fields) next[f.field] = translations?.[f.field]?.[activeLang] ?? "";
    setDraft(next);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translations, activeLang, fieldKey]);

  const edit = (field: string, value: string) => {
    setDirty(true);
    setDraft((s) => ({ ...s, [field]: value }));
  };

  const insertToken = (field: string, isHtml: boolean, token: string) => {
    if (isHtml) {
      const ed = editorsRef.current[field];
      if (ed) {
        ed.chain().focus().insertContent(token).run();
        return;
      }
    }
    const el = inputsRef.current[field];
    const current = draft[field] ?? "";
    if (!el) {
      edit(field, `${current}${token}`);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    edit(field, `${current.slice(0, start)}${token}${current.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const m = useMutation({
    mutationFn: () =>
      save({ data: { entityType, entityId, lang: activeLang, values: draft } }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["translations", entityType, entityId] });
      toast.success(t("translations.panel.saved"));
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("translations.panel.saveFailed")),
  });

  const auto = useMutation({
    mutationFn: async (mode: "empty" | "all") => {
      const items = fields
        .filter((f) => (originals[f.field] ?? "").trim() !== "")
        .filter((f) => mode === "all" || (draft[f.field] ?? "").trim() === "")
        .map((f) => ({ field: f.field, text: originals[f.field] ?? "", html: Boolean(f.html) }));
      if (items.length === 0) return {} as Record<string, string>;
      return await autoTranslate({
        data: { entityType, fromLang: defaultLang, toLang: activeLang, items },
      });
    },
    onSuccess: (out) => {
      const entries = Object.entries(out ?? {});
      if (entries.length === 0) {
        toast.info(t("translations.panel.autoNothing"));
        return;
      }
      setDraft((s) => ({ ...s, ...Object.fromEntries(entries) }));
      setDirty(true);
      toast.success(t("translations.panel.autoDone", { count: entries.length }));
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("translations.panel.autoFailed")),
  });

  if (languages.length === 0 || !activeLang) return null;

  const filled = fields.filter((f) => (draft[f.field] ?? "").trim() !== "").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          {t("translations.panel.title")}
        </CardTitle>
        <CardDescription>
          {t("translations.panel.description", {
            lang: defaultLang.toUpperCase(),
            filled,
            total: fields.length,
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {languages.length > 1 && (
          <div className="flex gap-1">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setActiveLang(l.code)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  l.code === activeLang
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("translations.panel.loading")}
          </div>
        ) : (
          fields.map((f) => (
            <div key={f.field} className="space-y-1.5">
              <Label>{f.labelKey ? t(f.labelKey) : f.label}</Label>
              {hideOriginals ? null : f.html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none rounded-md bg-muted px-3 py-2 text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(originals[f.field]?.trim() || `<p>${t("translations.panel.empty")}</p>`),
                  }}
                />
              ) : (
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {originals[f.field]?.trim() || t("translations.panel.empty")}
                </div>
              )}
              {f.html ? (
                <RichTextEditor
                  value={draft[f.field] ?? ""}
                  onEditorReady={(ed) => {
                    editorsRef.current[f.field] = ed;
                  }}
                  onChange={(html) => edit(f.field, html === "<p></p>" ? "" : html)}
                />
              ) : f.multiline ? (
                <Textarea
                  rows={3}
                  ref={(el) => {
                    inputsRef.current[f.field] = el;
                  }}
                  value={draft[f.field] ?? ""}
                  placeholder={t("translations.panel.placeholder", { lang: activeLang.toUpperCase() })}
                  onChange={(e) => edit(f.field, e.target.value)}
                />
              ) : (
                <Input
                  ref={(el) => {
                    inputsRef.current[f.field] = el;
                  }}
                  value={draft[f.field] ?? ""}
                  placeholder={t("translations.panel.placeholder", { lang: activeLang.toUpperCase() })}
                  onChange={(e) => edit(f.field, e.target.value)}
                />
              )}
              {showVariables && (
                <VariablePicker
                  onInsert={(token) => insertToken(f.field, Boolean(f.html), token)}
                />
              )}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="flex items-center gap-3 border-t pt-4">
        <Button type="button" onClick={() => m.mutate()} disabled={m.isPending || !dirty}>
          {m.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("translations.panel.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => auto.mutate("empty")}
          disabled={auto.isPending}
        >
          {auto.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {t("translations.panel.autoTranslate")}
        </Button>
        {dirty && (
          <span className="text-sm text-muted-foreground">{t("translations.panel.unsaved")}</span>
        )}
      </CardFooter>

      <AlertDialog open={status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("translations.panel.blockedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("translations.panel.blockedDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={reset}>{t("translations.panel.stay")}</AlertDialogCancel>
            <AlertDialogAction onClick={proceed}>{t("translations.panel.leave")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
