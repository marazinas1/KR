import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addMyIssueComment, getMyIssue, signMyPhoto } from "@/lib/tenant-portal.functions";

export const Route = createFileRoute("/_authenticated/nuomininkas/gedimai/$id")({
  component: IssueDetail,
});

function IssueDetail() {
  const { id } = Route.useParams();
  const { t, i18n } = useTranslation();
  const fetchIssue = useServerFn(getMyIssue);
  const comment = useServerFn(addMyIssueComment);
  const sign = useServerFn(signMyPhoto);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-issue", id],
    queryFn: () => fetchIssue({ data: { id } }),
  });
  const [body, setBody] = useState("");
  const send = useMutation({
    mutationFn: () => comment({ data: { issue_id: id, body } }),
    onSuccess: () => {
      toast.success(t("tenant.commentSent"));
      setBody("");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const fmt = (d: string) => new Date(d).toLocaleString(i18n.language);

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  const { issue, comments } = data;

  return (
    <div className="space-y-4">
      <Link to="/nuomininkas/gedimai" className="inline-flex h-10 items-center text-sm text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> {t("tenant.back")}
      </Link>
      <section className="rounded-xl border bg-background p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">{issue.title}</h1>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{t(`rental.issueStatus.${issue.status}`)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(`rental.issueCategory.${issue.category}`)} · {t("tenant.reported", { date: fmt(issue.created_at) })}
        </p>
        {issue.description && <p className="mt-3 whitespace-pre-wrap text-sm">{issue.description}</p>}
        {Array.isArray(issue.photo_paths) && issue.photo_paths.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(issue.photo_paths as string[]).map((p) => (
              <button
                key={p}
                type="button"
                className="h-11 rounded-md border px-3 text-xs"
                onClick={async () => {
                  const { url } = await sign({ data: { path: p, bucket: "issue-photos" } });
                  window.open(url, "_blank", "noopener");
                }}
              >
                {t("tenant.open")} · {p.split("/").pop()?.slice(0, 8)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-background p-5">
        <h2 className="font-semibold">{t("tenant.conversation")}</h2>
        {comments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("tenant.noComments")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {comments.map((c: { id: string; author_role: string; body: string; created_at: string }) => (
              <li
                key={c.id}
                className={`rounded-lg p-3 text-sm ${c.author_role === "tenant" ? "ml-6 bg-primary/10" : "mr-6 bg-muted"}`}
              >
                <p className="text-xs text-muted-foreground">
                  {c.author_role === "tenant" ? t("tenant.you") : t("tenant.manager")} · {fmt(c.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) send.mutate();
          }}
        >
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("tenant.writeMessage")} />
          <Button type="submit" className="h-12 w-full" disabled={send.isPending || !body.trim()}>
            {t("tenant.send")}
          </Button>
        </form>
      </section>
    </div>
  );
}
