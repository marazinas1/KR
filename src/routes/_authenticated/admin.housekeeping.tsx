import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addHousekeepingComment,
  assignHousekeepingTask,
  getHousekeepingDay,
  getHousekeepingWeek,
  listHousekeepers,
  setHousekeepingIssue,
  setHousekeepingStatus,
} from "@/lib/housekeeping.functions";
import {
  addDaysISO,
  STAFF_STATUS_CLASS,
  STAFF_STATUS_LABEL_KEYS,
  WORK_TYPE_LABEL_KEYS,
  type StaffRoomStatus,
} from "@/lib/staff-api-client";

export const Route = createFileRoute("/_authenticated/admin/housekeeping")({
  head: () => ({
    meta: [
      { title: "Kambarių tvarkymas · Dharma Stay" },
      {
        name: "description",
        content: "Savaitės ir dienos kambarių tvarkymo planas, priskyrimai ir komentarai.",
      },
      { property: "og:title", content: "Kambarių tvarkymas · Dharma Stay" },
      {
        property: "og:description",
        content: "Savaitės ir dienos kambarių tvarkymo planas, priskyrimai ir komentarai.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HousekeepingPage,
});

const STATUSES: StaffRoomStatus[] = ["nesvarus", "tvarkoma", "svarus"];

const WORK_CELL_CLASS: Record<string, string> = {
  turnover: "bg-destructive/15 text-destructive font-medium",
  departure: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pre_arrival: "bg-primary/10 text-primary",
  stayover: "bg-muted text-muted-foreground",
  none: "",
};

function initials(name: string | null): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function HousekeepingPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const fetchWeek = useServerFn(getHousekeepingWeek);
  const fetchDay = useServerFn(getHousekeepingDay);
  const fetchHousekeepers = useServerFn(listHousekeepers);

  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<{ roomId: string; date: string } | null>(null);
  const [mobileDate, setMobileDate] = useState<string | undefined>(undefined);

  const week = useQuery({
    queryKey: ["hk-week", startDate ?? ""],
    queryFn: () => fetchWeek({ data: { ...(startDate ? { startDate } : {}) } }),
    staleTime: 0,
  });

  const today = week.data?.days[0];
  const dayDate = mobileDate ?? today;
  const day = useQuery({
    queryKey: ["hk-day", dayDate ?? ""],
    queryFn: () => fetchDay({ data: { ...(dayDate ? { date: dayDate } : {}) } }),
    enabled: Boolean(dayDate),
    staleTime: 0,
  });

  const staffList = useQuery({
    queryKey: ["hk-staff"],
    queryFn: () => fetchHousekeepers(),
  });

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language === "en" ? "en-GB" : "lt-LT", { day: "numeric", month: "short" }),
    [i18n.language],
  );
  const fmtDay = useMemo(
    () => new Intl.DateTimeFormat(i18n.language === "en" ? "en-GB" : "lt-LT", { weekday: "short" }),
    [i18n.language],
  );
  const dLabel = (d: string) => fmt.format(new Date(`${d}T00:00:00`));

  const days = week.data?.days ?? [];
  const rangeLabel = days.length
    ? `${dLabel(days[0]!)} – ${dLabel(days[6]!)}`
    : "";

  const shift = (delta: number) => {
    const base = days[0];
    if (!base) return;
    setStartDate(addDaysISO(base, delta));
  };

  const summary = days.map((d, idx) => {
    let total = 0;
    let done = 0;
    for (const r of week.data?.rooms ?? []) {
      const cell = r.days[idx];
      if (!cell || cell.work_type === "none") continue;
      total += 1;
      if (cell.task_status === "atlikta") done += 1;
    }
    return { date: d, total, done };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold">{t("nav.housekeeping")}</h1>
        <Button variant="outline" size="sm" onClick={() => shift(-7)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {t("housekeeping.prevWeek")}
        </Button>
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        <Button variant="outline" size="sm" onClick={() => shift(7)}>
          {t("housekeeping.nextWeek")} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setStartDate(undefined)}>
          {t("housekeeping.thisWeek")}
        </Button>
      </div>

      {week.isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (week.data?.rooms.length ?? 0) === 0 ? (
        <p className="text-muted-foreground">{t("housekeeping.noRooms")}</p>
      ) : (
        <>
          {/* Savaitės lentelė — nuo md */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">{t("housekeeping.room")}</th>
                  {days.map((d, i) => (
                    <th key={d} className="p-2 text-center font-medium">
                      <div>{fmtDay.format(new Date(`${d}T00:00:00`))}</div>
                      <div className="text-xs text-muted-foreground">{dLabel(d)}</div>
                      <div className="text-xs text-muted-foreground">
                        {summary[i]!.done}/{summary[i]!.total}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.data?.rooms.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3 align-top">
                      <div className="font-medium">{r.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                        <span
                          className={`rounded-full border px-2 py-0.5 ${STAFF_STATUS_CLASS[r.status as StaffRoomStatus]}`}
                        >
                          {t(STAFF_STATUS_LABEL_KEYS[r.status as StaffRoomStatus])}
                        </span>
                        {r.has_issue && (
                          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                        )}
                      </div>
                    </td>
                    {r.days.map((c) => (
                      <td key={c.date} className="p-1 align-top">
                        <button
                          type="button"
                          onClick={() => setSelected({ roomId: r.id, date: c.date })}
                          className={`w-full rounded-md p-2 text-left text-xs hover:ring-2 hover:ring-ring ${
                            WORK_CELL_CLASS[c.work_type] ?? ""
                          }`}
                        >
                          <span className="block">
                            {c.work_type === "none" ? "—" : t(WORK_TYPE_LABEL_KEYS[c.work_type])}
                          </span>
                          <span className="mt-1 flex items-center gap-1">
                            {c.task_status === "atlikta" && <Check className="h-3.5 w-3.5" />}
                            {c.assigned_to_name && (
                              <span className="rounded bg-background/70 px-1">
                                {initials(c.assigned_to_name)}
                              </span>
                            )}
                            {c.comment_count > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {c.comment_count}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobilus — vienos dienos sąrašas */}
          <div className="space-y-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMobileDate(d)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs ${
                    dayDate === d ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  {dLabel(d)}
                </button>
              ))}
            </div>
            {day.isLoading ? (
              <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : (
              (day.data?.rooms ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected({ roomId: r.id, date: r.date })}
                  className="block w-full rounded-xl border bg-card p-4 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${STAFF_STATUS_CLASS[r.status as StaffRoomStatus]}`}
                    >
                      {t(STAFF_STATUS_LABEL_KEYS[r.status as StaffRoomStatus])}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t(WORK_TYPE_LABEL_KEYS[r.work_type])}
                    {r.assigned_to_name
                      ? ` · ${t("staff.assignedTo", { name: r.assigned_to_name })}`
                      : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      <RoomSheet
        selection={selected}
        onClose={() => setSelected(null)}
        staff={staffList.data ?? []}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["hk-week"] });
          qc.invalidateQueries({ queryKey: ["hk-day"] });
        }}
      />
    </div>
  );
}

function RoomSheet({
  selection,
  onClose,
  staff,
  onChanged,
}: {
  selection: { roomId: string; date: string } | null;
  onClose: () => void;
  staff: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const fetchDay = useServerFn(getHousekeepingDay);
  const saveStatus = useServerFn(setHousekeepingStatus);
  const saveAssign = useServerFn(assignHousekeepingTask);
  const saveIssue = useServerFn(setHousekeepingIssue);
  const saveComment = useServerFn(addHousekeepingComment);

  const date = selection?.date;
  const dayQuery = useQuery({
    queryKey: ["hk-day", date ?? ""],
    queryFn: () => fetchDay({ data: { ...(date ? { date } : {}) } }),
    enabled: Boolean(date),
    staleTime: 0,
  });
  const room = dayQuery.data?.rooms.find((r) => r.id === selection?.roomId);

  const [issueOn, setIssueOn] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIssueOn(Boolean(room?.has_issue));
    setIssueNote(room?.issue_note ?? "");
  }, [room?.id, room?.has_issue, room?.issue_note]);

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : t("staff.error"));
  const refresh = () => {
    dayQuery.refetch();
    onChanged();
  };

  const statusM = useMutation({
    mutationFn: (status: StaffRoomStatus) =>
      saveStatus({ data: { propertyId: selection!.roomId, date: selection!.date, status } }),
    onSuccess: () => {
      toast.success(t("staff.statusUpdated"));
      refresh();
    },
    onError,
  });
  const assignM = useMutation({
    mutationFn: (userId: string | null) =>
      saveAssign({ data: { propertyId: selection!.roomId, date: selection!.date, userId } }),
    onSuccess: refresh,
    onError,
  });
  const issueM = useMutation({
    mutationFn: (p: { hasIssue: boolean; issueNote: string }) =>
      saveIssue({ data: { propertyId: selection!.roomId, ...p } }),
    onSuccess: () => {
      toast.success(t("staff.issueSaved"));
      refresh();
    },
    onError,
  });
  const commentM = useMutation({
    mutationFn: (body: string) =>
      saveComment({ data: { propertyId: selection!.roomId, date: selection!.date, body } }),
    onSuccess: () => {
      setMessage("");
      refresh();
    },
    onError,
  });

  return (
    <Sheet open={Boolean(selection)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{room?.name ?? t("housekeeping.room")}</SheetTitle>
        </SheetHeader>

        {dayQuery.isLoading || !room ? (
          <p className="p-4 text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="space-y-5 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{selection?.date}</span>
              <span
                className={`rounded-full border px-2 py-0.5 ${STAFF_STATUS_CLASS[room.status as StaffRoomStatus]}`}
              >
                {t(STAFF_STATUS_LABEL_KEYS[room.status as StaffRoomStatus])}
              </span>
              <span className={`rounded-md px-2 py-0.5 ${WORK_CELL_CLASS[room.work_type] ?? ""}`}>
                {t(WORK_TYPE_LABEL_KEYS[room.work_type])}
              </span>
            </div>

            {(room.departing || room.arriving) && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                {room.departing && (
                  <p>
                    {t("staff.departingGuest", { guests: room.departing.guests })}
                    {room.departing.time
                      ? ` · ${t("staff.departingAt", { time: room.departing.time })}`
                      : ""}
                  </p>
                )}
                {room.arriving && (
                  <div className="space-y-2">
                    <p>
                      {t("staff.arrivingGuest", { guests: room.arriving.guests })}
                      {room.arriving.time
                        ? ` · ${t("staff.arrivingAt", { time: room.arriving.time })}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {room.arriving.adults > 0 && (
                        <span>{t("staff.adults", { count: room.arriving.adults })}</span>
                      )}
                      {room.arriving.children > 0 && (
                        <span>{t("staff.children", { count: room.arriving.children })}</span>
                      )}
                      {room.arriving.infants > 0 && (
                        <span className="font-semibold text-foreground">
                          {t("staff.infants", { count: room.arriving.infants })}
                        </span>
                      )}
                    </div>
                    {room.arriving.extras.length > 0 && (
                      <div className="rounded-md bg-accent/60 p-2">
                        <p className="text-xs font-medium">{t("staff.prepare")}</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {room.arriving.extras.map((e) => (
                            <li key={e} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary" /> {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={room.status === s ? "default" : "outline"}
                  disabled={statusM.isPending}
                  onClick={() => statusM.mutate(s)}
                >
                  {t(STAFF_STATUS_LABEL_KEYS[s])}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("housekeeping.assignee")}</p>
              <Select
                value={room.assigned_to ?? "none"}
                onValueChange={(v) => assignM.mutate(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("housekeeping.unassigned")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("housekeeping.unassigned")}</SelectItem>
                  {staff.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> {t("staff.issue")}
                </span>
                <Switch
                  checked={issueOn}
                  onCheckedChange={(v) => {
                    setIssueOn(v);
                    if (!v) {
                      setIssueNote("");
                      issueM.mutate({ hasIssue: false, issueNote: "" });
                    }
                  }}
                />
              </div>
              {issueOn && (
                <div className="space-y-2">
                  <Textarea
                    value={issueNote}
                    maxLength={500}
                    placeholder={t("staff.issueNote")}
                    onChange={(e) => setIssueNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={issueM.isPending}
                    onClick={() => issueM.mutate({ hasIssue: true, issueNote })}
                  >
                    {t("common.save")}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("staff.comments")}</p>
              {room.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("staff.noComments")}</p>
              ) : (
                <ul className="space-y-2">
                  {room.comments.map((c) => (
                    <li
                      key={c.id}
                      className={`rounded-lg border p-2 text-sm ${
                        c.author_role === "admin" ? "bg-accent/60" : "bg-card"
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.author_name || "—"}</span>
                        <span>
                          {c.author_role === "admin"
                            ? t("staff.roleAdmin")
                            : t("staff.roleHousekeeper")}
                        </span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Textarea
                value={message}
                maxLength={1000}
                placeholder={t("housekeeping.commentPlaceholder")}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={commentM.isPending || message.trim().length === 0}
                onClick={() => commentM.mutate(message.trim())}
              >
                {t("staff.send")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
