import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tooltip,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          {icon}
          {tooltip ? <Info className="h-3.5 w-3.5" aria-label={tooltip} /> : null}
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
