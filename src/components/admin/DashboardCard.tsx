import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A dashboard card is a link: the number is the headline, the body is a short
 * preview, and the whole card opens the filtered list behind that number.
 */
export function DashboardCard({
  title,
  count,
  tone = "default",
  icon,
  to,
  children,
  footer,
}: {
  title: string;
  count: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  icon?: ReactNode;
  to: Pick<LinkProps, "to" | "search" | "params">;
  children?: ReactNode;
  footer?: string;
}) {
  const toneClass = {
    default: "border-border",
    ok: "border-emerald-300/70",
    warn: "border-amber-300/80",
    danger: "border-destructive/50",
  }[tone];
  const countClass = {
    default: "",
    ok: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-destructive",
  }[tone];
  return (
    <Link
      {...(to as LinkProps)}
      className={`group flex flex-col rounded-lg border bg-card p-4 shadow-sm transition hover:bg-accent/40 ${toneClass}`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{title}</span>
        {icon}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${countClass}`}>{count}</div>
      {children ? <div className="mt-3 space-y-1 text-sm">{children}</div> : null}
      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
        <span>{footer}</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function CardRow({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate">{left}</span>
      {right !== undefined ? (
        <span className="shrink-0 tabular-nums text-muted-foreground">{right}</span>
      ) : null}
    </div>
  );
}
