import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/brand";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: `Naujas slaptažodis | ${PLATFORM_NAME}` }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }
      // Atsarginiai variantai: PKCE kodas arba token_hash nuorodoje.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const type = url.searchParams.get("type");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setReady(true);
        return;
      }
      if (tokenHash && (type === "invite" || type === "recovery" || type === "signup")) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "invite" | "recovery" | "signup",
          token_hash: tokenHash,
        });
        if (!error) setReady(true);
      }
    };
    void bootstrap();

    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("auth.updated"));
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{t("auth.newPasswordTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ready
                ? t("auth.newPasswordReady")
                : t("auth.newPasswordPending")}
            </p>
          </div>
          {ready && (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw">{t("auth.newPassword")}</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">{t("auth.repeatPassword")}</Label>
                <Input id="pw2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t("auth.saving") : t("auth.save")}
              </Button>
            </form>
          )}
          <div className="text-center">
            <Link to="/auth" className="text-xs text-muted-foreground hover:underline">{t("auth.toLogin")}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
