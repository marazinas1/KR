import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pv_session";

/** Paths that must never be tracked (admin/tenant/auth areas). */
function isPrivatePath(path: string) {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/nuomininkas") ||
    path.startsWith("/auth") ||
    path.startsWith("/api")
  );
}

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return "anonymous";
  }
}

/** First-party page-view tracking: one row per client-side navigation. */
export function usePageTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPrivatePath(pathname)) return;

    const timer = window.setTimeout(() => {
      void supabase
        .from("page_views")
        .insert({
          path: pathname.slice(0, 2048),
          session_id: getSessionId(),
          referrer: (document.referrer || "").slice(0, 2048),
          user_agent: navigator.userAgent.slice(0, 1024),
        })
        .then(() => undefined, () => undefined);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname]);
}
