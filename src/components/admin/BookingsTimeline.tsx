import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function BookingsTimeline({
  title,
  icon,
  bookings,
  empty,
  showAmount = false,
}: {
  title: string;
  icon?: ReactNode;
  bookings: any[];
  empty?: string;
  showAmount?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h3>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {bookings.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty ?? t("dashboard.emptyList")}</p>
        ) : (
          bookings.map((b: any) => (
            <Link
              key={b.id}
              to="/admin/bookings/$id"
              params={{ id: b.id }}
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {b.properties?.name ?? "—"} · {b.customer_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.date_from} → {b.date_to}
                </div>
              </div>
              {showAmount ? (
                <div className="ml-2 shrink-0 text-sm">{Number(b.total_amount ?? 0).toFixed(0)} €</div>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
