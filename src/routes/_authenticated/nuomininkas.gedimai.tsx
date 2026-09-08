import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Camera, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMyIssue, getMyLease, listMyIssues } from "@/lib/tenant-portal.functions";
import { EVIDENCE_OPTIONS, uploadOptimizedToStorage } from "@/lib/image-optimize";
import { ISSUE_CATEGORIES } from "@/lib/rental";

export const Route = createFileRoute("/_authenticated/nuomininkas/gedimai")({
  component: IssuesLayout,
});

function IssuesLayout() {
  // Child route (/gedimai/$id) renders instead of the list.
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId === "/_authenticated/nuomininkas/gedimai/$id");
  return isChild ? <Outlet /> : <IssuesList />;
}

function IssuesList() {
  const { t, i18n } = useTranslation();
  const fetchIssues = useServerFn(listMyIssues);
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ["my-issues"], queryFn: () => fetchIssues() });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("tenant.issues")}</h1>
        <Button className="h-11" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> {t("tenant.reportIssue")}
        </Button>
      </div>

      {open && (
        <NewIssueForm
          onCreated={() => {
            setOpen(false);
            refetch();
          }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : data.length === 0 ? (
        <div className="rounded-xl border bg-background p-5 text-sm">{t("tenant.noIssues")}</div>
      ) : (
        <ul className="space-y-2">
          {data.map((i) => (
            <li key={i.id}>
              <Link
                to="/nuomininkas/gedimai/$id"
                params={{ id: i.id }}
                className="flex items-center justify-between rounded-xl border bg-background p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`rental.issueCategory.${i.category}`)} ·{" "}
                    {t("tenant.reported", { date: new Date(i.created_at).toLocaleDateString(i18n.language) })}
                  </p>
                </div>
                <span className="ml-3 flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1">{t(`rental.issueStatus.${i.status}`)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewIssueForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const create = useServerFn(createMyIssue);
  const fetchLease = useServerFn(getMyLease);
  const { data: mine } = useQuery({ queryKey: ["my-lease"], queryFn: () => fetchLease() });
  const [category, setCategory] = useState<(typeof ISSUE_CATEGORIES)[number]>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: () => create({ data: { category, title, description, photo_paths: photos } }),
    onSuccess: () => {
      toast.success(t("tenant.issueCreated"));
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message === "NoLease" ? t("tenant.noLease") : e.message),
  });

  const onPhoto = async (file: File | undefined) => {
    const unitId = mine?.unit?.id;
    if (!file || !unitId || photos.length >= 5) return;
    setUploading(true);
    try {
      const up = await uploadOptimizedToStorage(file, unitId, "issue-photos", EVIDENCE_OPTIONS);
      setPhotos((p) => [...p, up.path]);
    } catch {
      toast.error(t("tenant.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="space-y-3 rounded-xl border bg-background p-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="font-semibold">{t("tenant.newIssue")}</h2>
      <label className="block text-sm">
        {t("tenant.category")}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof ISSUE_CATEGORIES)[number])}
          className="mt-1 h-12 w-full rounded-md border bg-background px-3"
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`rental.issueCategory.${c}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {t("tenant.issueTitle")}
        <Input className="mt-1 h-12" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
      </label>
      <label className="block text-sm">
        {t("tenant.description")}
        <Textarea className="mt-1" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="text-sm">
        {t("tenant.photos")}
        <div className="mt-1 flex items-center gap-2">
          <label className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border">
            <Camera className="h-5 w-5" />
            {uploading ? t("common.loading") : t("tenant.addPhoto")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
              disabled={photos.length >= 5}
            />
          </label>
          <span className="text-xs text-muted-foreground">{photos.length}/5</span>
        </div>
      </div>
      <Button type="submit" className="h-12 w-full text-base" disabled={mutation.isPending || uploading || !title}>
        {t("tenant.send")}
      </Button>
    </form>
  );
}
