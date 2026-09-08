import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addIssueComment,
  createIssue,
  listIssueComments,
  listIssues,
  updateIssue,
} from "@/lib/issues.functions";
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/lib/rental";
import type { IssueCategory, IssuePriority, IssueStatus } from "@/lib/rental";

export function IssuesTab({ unitId }: { unitId: string }) {
  const { t } = useTranslation();
  const fetchIssues = useServerFn(listIssues);
  const create = useServerFn(createIssue);
  const update = useServerFn(updateIssue);

  const { data: issues = [], refetch } = useQuery({
    queryKey: ["unit-issues", unitId],
    queryFn: () => fetchIssues({ data: { unit_id: unitId } }),
  });

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "other" as IssueCategory,
    priority: "normal" as IssuePriority,
  });

  const add = useMutation({
    mutationFn: () => create({ data: { unit_id: unitId, ...draft } }),
    onSuccess: () => {
      toast.success(t("rental.issues.created"));
      setDraft({ ...draft, title: "", description: "" });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; status?: IssueStatus; priority?: IssuePriority }) =>
      update({ data: v }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="i-title">{t("rental.issues.title")}</Label>
          <Input
            id="i-title"
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="i-cat">{t("rental.issues.category")}</Label>
          <select
            id="i-cat"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as IssueCategory })}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`rental.issueCategory.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="i-prio">{t("rental.issues.priority")}</Label>
          <select
            id="i-prio"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value as IssuePriority })}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`rental.issuePriority.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="i-desc">{t("rental.issues.description")}</Label>
          <Textarea
            id="i-desc"
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={add.isPending}>
            {t("rental.issues.add")}
          </Button>
        </div>
      </form>

      {issues.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("rental.issues.empty")}</p>
      )}

      <ul className="space-y-3">
        {issues.map((i) => (
          <li key={i.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`rental.issueCategory.${i.category}`)} ·{" "}
                  {t(`rental.issuePriority.${i.priority}`)} ·{" "}
                  {new Date(i.created_at).toLocaleDateString()}
                  {i.reporter_name ? ` · ${i.reporter_name}` : ""}
                </p>
              </div>
              <select
                value={i.status}
                onChange={(e) => patch.mutate({ id: i.id, status: e.target.value as IssueStatus })}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label={t("rental.issues.status")}
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`rental.issueStatus.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            {i.description && <p className="mt-2 text-sm">{i.description}</p>}
            <IssueThread issueId={i.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function IssueThread({ issueId }: { issueId: string }) {
  const { t } = useTranslation();
  const fetchComments = useServerFn(listIssueComments);
  const addComment = useServerFn(addIssueComment);
  const [body, setBody] = useState("");
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["issue-comments", issueId],
    queryFn: () => fetchComments({ data: { issue_id: issueId } }),
  });
  const m = useMutation({
    mutationFn: () => addComment({ data: { issue_id: issueId, body, is_internal: false } }),
    onSuccess: () => {
      setBody("");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 border-t pt-2">
      <ul className="space-y-1 text-sm">
        {comments.map((c) => (
          <li key={c.id}>
            <span className="text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleString()} · {c.author_role}
            </span>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) m.mutate();
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("rental.issues.commentPlaceholder")}
        />
        <Button type="submit" size="sm" disabled={m.isPending}>
          {t("rental.issues.send")}
        </Button>
      </form>
    </div>
  );
}
