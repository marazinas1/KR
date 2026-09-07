import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
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
import { getEmailDiagnostics, sendResendTestEmail } from "@/lib/email-test.functions";

export function EmailTestSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const fetchDiag = useServerFn(getEmailDiagnostics);
  const sendTest = useServerFn(sendResendTestEmail);
  const [to, setTo] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: diag, isLoading } = useQuery({
    queryKey: ["email-diagnostics"],
    queryFn: () => fetchDiag(),
  });

  useEffect(() => {
    if (diag?.adminEmail && !to) setTo(diag.adminEmail);
  }, [diag?.adminEmail]);

  const send = useMutation({
    mutationFn: () => sendTest({ data: { to: to.trim() } }),
    onSuccess: (r) => {
      setResult({
        ok: r.ok,
        text: r.ok
          ? t("settings.email.accepted", { from: r.from, detail: r.detail })
          : t("settings.email.error", { status: r.status, from: r.from, detail: r.detail }),
      });
      if (r.ok) toast.success(t("settings.email.sent"));
      else toast.error(t("settings.email.sendFailed"));
    },
    onError: (e) => {
      const text = e instanceof Error ? e.message : t("settings.email.unknownError");
      setResult({ ok: false, text });
      toast.error(text);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          {t("settings.email.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.email.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settings.email.loading")}
          </div>
        ) : (
          <div className="grid gap-1 rounded-lg border p-3 text-xs text-muted-foreground">
            <div>
              {t("settings.email.sender")} <span className="font-medium text-foreground">{diag?.from}</span>
              {diag?.usesFallbackFrom && t("settings.email.fallbackFrom")}
            </div>
            <div>
              {diag?.hasResendKey ? "Resend_API ✓" : "Resend_API ✗"}{" "}
              {diag?.hasLovableKey ? "Projekto_API ✓" : "Projekto_API ✗"}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:max-w-md">
          <Label htmlFor="email-test-to">{t("settings.email.to")}</Label>
          <Input
            id="email-test-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="admin@pavyzdys.lt"
            disabled={!canEdit || send.isPending}
          />
        </div>

        <Button
          type="button"
          onClick={() => send.mutate()}
          disabled={!canEdit || send.isPending || !to.trim()}
        >
          {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("settings.email.send")}
        </Button>

        {result && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
              result.ok ? "border-primary/40 text-foreground" : "border-destructive/50 text-destructive"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="break-all">{result.text}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
