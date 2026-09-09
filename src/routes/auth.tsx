import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/properties.functions";
import { requestPasswordReset } from "@/lib/auth-recovery.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicBranding } from "@/lib/property-settings.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/BrandMark";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: `Prisijungimas | ${PLATFORM_NAME}` }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const sendReset = useServerFn(requestPasswordReset);
  const fetchBranding = useServerFn(getPublicBranding);
  const { data: branding } = useQuery({
    queryKey: ["public-branding"],
    queryFn: () => fetchBranding(),
    staleTime: 5 * 60 * 1000,
  });
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const goToDestination = async () => {
      try {
        const role = await fetchRole();
        if (role.isManager) navigate({ to: "/admin", replace: true });
        else if (role.isTenant) navigate({ to: "/nuomininkas", replace: true });
        else navigate({ to: "/admin", replace: true });
      } catch {
        navigate({ to: "/admin", replace: true });
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return;
      if (session) void goToDestination();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goToDestination();
    });
    return () => subscription.unsubscribe();
  }, [navigate, fetchRole]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.signedIn"));
      } else {
        await sendReset({
          data: { email, redirectTo: `${window.location.origin}/reset-password` },
        });
        toast.success(t("auth.resetSent"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Kairė pusė — prisijungimas */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "login" ? t("auth.loginTitle") : t("auth.forgotTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "forgot" ? t("auth.forgotSubtitle") : t("auth.loginSubtitle")}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="pw">{t("auth.password")}</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? t("auth.busy") : mode === "login" ? t("auth.submitLogin") : t("auth.submitReset")}
            </Button>
          </form>
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <button type="button" className="underline" onClick={() => setMode("forgot")}>
                {t("auth.forgotLink")}
              </button>
            ) : (
              <button type="button" className="underline" onClick={() => setMode("login")}>
                {t("auth.backToLogin")}
              </button>
            )}
            <div>
              <Link to="/" className="text-xs hover:underline">
                {t("auth.home")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dešinė pusė — tamsi prekės ženklo plokštuma */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-foreground lg:flex">
        <div className="relative flex flex-col items-center gap-6 px-12 text-center text-background">
          <BrandMark
            size="lg"
            displayName={branding?.displayName ?? ""}
            tagline={branding?.tagline}
            logoUrl={branding?.logoUrl || undefined}
          />
          <div className="h-px w-12 bg-background/25" />
        </div>
      </div>

    </div>
  );
}
