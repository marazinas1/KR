import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  callStaffApi,
  STAFF_STATUS_CLASS,
  STAFF_STATUS_LABEL_KEYS,
  WORK_TYPE_LABEL_KEYS,
  type StaffRoom,
  type StaffRoomStatus,
} from "@/lib/staff-api-client";

const STATUSES: StaffRoomStatus[] = ["nesvarus", "tvarkoma", "svarus"];

type RoomsResponse = { data: StaffRoom[]; date: string };
type StaffComment = {
  id: string;
  author_role: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/staff/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
  component: RoomDetail,
});

function RoomDetail() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const { date: searchDate } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const dateKey = searchDate ?? "";
  const query = searchDate ? `?date=${searchDate}` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["staff-rooms", dateKey],
    queryFn: () => callStaffApi<RoomsResponse>(`/rooms${query}`),
  });
  const room = data?.data.find((r) => r.id === id);
  const date = searchDate ?? data?.date;

  const comments = useQuery({
    queryKey: ["staff-comments", id, dateKey],
    queryFn: () => callStaffApi<{ data: StaffComment[] }>(`/rooms/${id}/comments${query}`),
  });

  const [issueOn, setIssueOn] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!room) return;
    setIssueOn(room.has_issue);
    setIssueNote(room.issue_note ?? "");
  }, [room?.id, room?.has_issue, room?.issue_note]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff-rooms"] });
  };
  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : t("staff.error"));

  const setStatus = useMutation({
    mutationFn: (status: StaffRoomStatus) =>
      callStaffApi(`/rooms/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, ...(date ? { date } : {}) }),
      }),
    onSuccess: () => {
      toast.success(t("staff.statusUpdated"));
      invalidate();
    },
    onError,
  });

  const saveIssue = useMutation({
    mutationFn: (payload: { has_issue: boolean; issue_note: string }) =>
      callStaffApi(`/rooms/${id}/issue`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(t("staff.issueSaved"));
      invalidate();
    },
    onError,
  });

  const assign = useMutation({
    mutationFn: () =>
      callStaffApi(`/rooms/${id}/assign`, {
        method: "POST",
        body: JSON.stringify(date ? { date } : {}),
      }),
    onSuccess: invalidate,
    onError,
  });
  const unassign = useMutation({
    mutationFn: () =>
      callStaffApi(`/rooms/${id}/unassign`, {
        method: "POST",
        body: JSON.stringify(date ? { date } : {}),
      }),
    onSuccess: invalidate,
    onError,
  });

  const sendComment = useMutation({
    mutationFn: (body: string) =>
      callStaffApi(`/rooms/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, ...(date ? { date } : {}) }),
      }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["staff-comments", id] });
      invalidate();
    },
    onError,
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">{t("common.loading")}</div>;
  if (!room) return <div className="p-4 text-muted-foreground">{t("staff.noRooms")}</div>;

  const arriving = room.arriving;
  const departing = room.departing;
  const showGuests = Boolean(arriving || departing);

  return (
    <div className="space-y-5 pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/staff" })}>
        <ChevronLeft className="mr-1 h-4 w-4" /> {t("common.back")}
      </Button>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{room.name}</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 ${STAFF_STATUS_CLASS[room.status]}`}
          >
            {t(STAFF_STATUS_LABEL_KEYS[room.status])}
          </span>
          {room.work_type !== "none" && (
            <span
              className={`rounded-md px-2 py-0.5 ${
                room.work_type === "turnover"
                  ? "bg-destructive/10 font-medium text-destructive"
                  : "bg-muted"
              }`}
            >
              {t(WORK_TYPE_LABEL_KEYS[room.work_type])}
            </span>
          )}
        </div>
      </div>

      {showGuests && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          {departing && (
            <p className="text-sm">
              {t("staff.departingGuest", { guests: departing.guests })}
              {departing.time ? ` · ${t("staff.departingAt", { time: departing.time })}` : ""}
            </p>
          )}
          {arriving && (
            <div className="space-y-2">
              <p className="text-sm">
                {t("staff.arrivingGuest", { guests: arriving.guests })}
                {arriving.time ? ` · ${t("staff.arrivingAt", { time: arriving.time })}` : ""}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {arriving.adults > 0 && <span>{t("staff.adults", { count: arriving.adults })}</span>}
                {arriving.children > 0 && (
                  <span>{t("staff.children", { count: arriving.children })}</span>
                )}
                {arriving.infants > 0 && (
                  <span className="font-semibold text-foreground">
                    {t("staff.infants", { count: arriving.infants })}
                  </span>
                )}
              </div>
              {arriving.extras.length > 0 && (
                <div className="rounded-lg bg-accent/60 p-3">
                  <p className="text-sm font-medium">{t("staff.prepare")}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {arriving.extras.map((e) => (
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

      <div className="space-y-3 rounded-xl border bg-card p-4">
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
                saveIssue.mutate({ has_issue: false, issue_note: "" });
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
              disabled={saveIssue.isPending}
              onClick={() => saveIssue.mutate({ has_issue: true, issue_note: issueNote })}
            >
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="lg"
            variant={room.status === s ? "default" : "outline"}
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate(s)}
          >
            {t(STAFF_STATUS_LABEL_KEYS[s])}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {!room.assigned_to ? (
          <Button
            className="w-full"
            size="lg"
            disabled={assign.isPending}
            onClick={() => assign.mutate()}
          >
            {t("staff.takeRoom")}
          </Button>
        ) : room.assigned_to_me ? (
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            disabled={unassign.isPending}
            onClick={() => unassign.mutate()}
          >
            {t("staff.releaseRoom")}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {t("staff.assignedTo", {
              name: room.assigned_to_name?.trim() || room.assigned_to_email || "—",
            })}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t("staff.comments")}</p>
        {comments.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (comments.data?.data.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">{t("staff.noComments")}</p>
        ) : (
          <ul className="space-y-2">
            {comments.data?.data.map((c) => (
              <li
                key={c.id}
                className={`rounded-lg border p-3 text-sm ${
                  c.author_role === "admin" ? "bg-accent/60" : "bg-card"
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.author_name || "—"}</span>
                  <span>
                    {c.author_role === "admin" ? t("staff.roleAdmin") : t("staff.roleHousekeeper")}
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
          placeholder={t("staff.commentPlaceholder")}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={sendComment.isPending || message.trim().length === 0}
          onClick={() => sendComment.mutate(message.trim())}
        >
          {t("staff.send")}
        </Button>
      </div>
    </div>
  );
}
