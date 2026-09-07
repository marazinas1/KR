import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import {
  addDaysISO,
  callStaffApi,
  STAFF_STATUS_CLASS,
  STAFF_STATUS_LABEL_KEYS,
  WORK_TYPE_LABEL_KEYS,
  type StaffRoom,
} from "@/lib/staff-api-client";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: RoomList,
});

type RoomsResponse = { data: StaffRoom[]; date: string };

function RoomList() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [mineOnly, setMineOnly] = useState(false);

  const base = qc.getQueryData<RoomsResponse>(["staff-rooms", ""])?.date;
  const date = offset === 0 ? undefined : base ? addDaysISO(base, offset) : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-rooms", date ?? ""],
    queryFn: () => callStaffApi<RoomsResponse>(`/rooms${date ? `?date=${date}` : ""}`),
    refetchInterval: 30_000,
  });

  const dayButtons = [
    { off: 0, label: t("staff.today") },
    { off: 1, label: t("staff.tomorrow") },
    { off: 2, label: t("staff.dayAfter") },
  ];

  const rooms = (data?.data ?? []).filter((r) => (mineOnly ? r.assigned_to_me : true));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {dayButtons.map((d) => (
          <button
            key={d.off}
            type="button"
            onClick={() => setOffset(d.off)}
            className={`rounded-full border px-4 py-2 text-sm ${
              offset === d.off ? "border-primary bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {d.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {[false, true].map((m) => (
            <button
              key={String(m)}
              type="button"
              onClick={() => setMineOnly(m)}
              className={`rounded-full border px-4 py-2 text-sm ${
                mineOnly === m ? "border-primary bg-accent" : "bg-card"
              }`}
            >
              {m ? t("staff.filterMine") : t("staff.filterAll")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 text-muted-foreground">{t("common.loading")}</div>
      ) : error ? (
        <div className="p-4 text-destructive">{(error as Error).message}</div>
      ) : rooms.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("staff.noWorkToday")}</p>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => (
            <Link
              key={r.id}
              to="/staff/$id"
              params={{ id: r.id }}
              search={{ date: r.date }}
              className="block rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{r.name}</span>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${STAFF_STATUS_CLASS[r.status]}`}
                >
                  {t(STAFF_STATUS_LABEL_KEYS[r.status])}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {r.work_type !== "none" && (
                  <span
                    className={`rounded-md px-2 py-0.5 ${
                      r.work_type === "turnover"
                        ? "bg-destructive/10 font-medium text-destructive"
                        : "bg-muted"
                    }`}
                  >
                    {t(WORK_TYPE_LABEL_KEYS[r.work_type])}
                  </span>
                )}
                {r.has_issue && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("staff.issue")}
                  </span>
                )}
                {r.comment_count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {r.comment_count}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {r.departing && (
                  <p>
                    {r.departing.time
                      ? t("staff.departingAt", { time: r.departing.time })
                      : t("staff.departingGuest", { guests: r.departing.guests })}
                  </p>
                )}
                {r.arriving && (
                  <p>
                    {r.arriving.time
                      ? t("staff.arrivingAt", { time: r.arriving.time })
                      : t("staff.arrivingGuest", { guests: r.arriving.guests })}
                  </p>
                )}
                {r.assigned_to && (
                  <p>
                    {t("staff.assignedTo", {
                      name: r.assigned_to_name?.trim() || r.assigned_to_email || "—",
                    })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
