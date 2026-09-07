import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listApiClients,
  createApiClient,
  setApiClientActive,
  deleteApiClient,
} from "@/lib/api-keys.functions";

const LOVABLE_PROJECT_ID = "3b144e50-7336-4c5e-a93d-7aeca70328ba";
const API_PATH = "/api/public/v1";

const BASE_URLS = [
  {
    envVar: "RENTIVO_API_URL_PROD",
    labelKey: "settings.api.prodLabel",
    url: `https://dharmastay.lovable.app${API_PATH}`,
    hintKey: "settings.api.prodHint",
    alt: {
      labelKey: "settings.api.altLabel",
      url: `https://project--${LOVABLE_PROJECT_ID}.lovable.app${API_PATH}`,
    },
  },
  {
    envVar: "RENTIVO_API_URL_DEV",
    labelKey: "settings.api.devLabel",
    url: `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app${API_PATH}`,
    hintKey: "settings.api.devHint",
  },
] as const;

function isPreviewWindow(): boolean {
  if (typeof window === "undefined") return false;
  return !window.location.origin.includes(".lovable.app");
}

export function ApiAccessSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchList = useServerFn(listApiClients);
  const create = useServerFn(createApiClient);
  const setActive = useServerFn(setApiClientActive);
  const remove = useServerFn(deleteApiClient);

  const [name, setName] = useState("");
  const [origins, setOrigins] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["api-clients"],
    queryFn: () => fetchList(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          name: name.trim(),
          allowedOrigins: origins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (res) => {
      setNewKey(res.apiKey);
      setName("");
      setOrigins("");
      qc.invalidateQueries({ queryKey: ["api-clients"] });
      toast.success(t("settings.api.created"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.api.createFailed")),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => setActive({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-clients"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.api.updateFailed")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-clients"] });
      toast.success(t("settings.api.deleted"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.api.deleteFailed")),
  });

  const copy = async (value: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        toast.success(t("settings.api.copied"));
        return;
      }
      throw new Error("no-clipboard-api");
    } catch {
      // Fallback: clipboard API is blocked in iframes / non-secure contexts.
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, value.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
        toast.success(t("settings.api.copied"));
      } catch {
        toast.error(t("settings.api.copyFailed"));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" />
          {t("settings.api.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.api.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            {t("settings.api.envHint")}
          </p>
          {BASE_URLS.map((item) => (
            <div key={item.envVar} className="rounded-md border bg-background/50 p-3">
              <p className="text-xs font-semibold">{item.envVar}</p>
              <p className="text-[11px] text-muted-foreground">{t(item.labelKey)}</p>
              <div className="mt-1.5 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 text-xs">
                  {item.url}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={() => copy(item.url)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t(item.hintKey)}</p>
              {"alt" in item && item.alt && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-[11px] text-muted-foreground">{t(item.alt.labelKey)}</p>
                  <div className="mt-1 flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 text-[11px]">
                      {item.alt.url}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(item.alt.url)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isPreviewWindow() && (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              {t("settings.api.previewWarning")}
            </p>
          )}
        </div>

        {newKey && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-medium">{t("settings.api.newKeyTitle")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                {newKey}
              </code>
              <Button type="button" size="sm" onClick={() => copy(newKey)}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                {t("settings.api.copy")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}

        {canEdit && (
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) {
                toast.error(t("settings.api.nameRequired"));
                return;
              }
              createMut.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="api-key-name">{t("settings.api.name")}</Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.api.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-key-origins">{t("settings.api.origins")}</Label>
              <Input
                id="api-key-origins"
                value={origins}
                onChange={(e) => setOrigins(e.target.value)}
                placeholder="https://mano-svetaine.lt"
              />
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {t("settings.api.create")}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("settings.api.loading")}
            </div>
          )}
          {!isLoading && (clients ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t("settings.api.empty")}</p>
          )}
          {(clients ?? []).map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.is_active ? (
                    <Badge>{t("settings.api.active")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("settings.api.disabled")}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.key_prefix}… ·{" "}
                  {t("settings.api.createdAt", {
                    date: new Date(c.created_at).toLocaleDateString("lt-LT"),
                  })}
                  {" · "}
                  {c.last_used_at
                    ? t("settings.api.usedAt", {
                        date: new Date(c.last_used_at).toLocaleString("lt-LT"),
                      })
                    : t("settings.api.neverUsed")}
                </p>
                {(c.allowed_origins ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.api.domains", { list: (c.allowed_origins ?? []).join(", ") })}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMut.mutate({ id: c.id, isActive: !c.is_active })}
                  >
                    {c.is_active ? t("settings.api.disable") : t("settings.api.enable")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t("settings.api.confirmDelete", { name: c.name })))
                        deleteMut.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}