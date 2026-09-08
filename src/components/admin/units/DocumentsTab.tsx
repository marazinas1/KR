import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/DatePicker";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteDocument,
  listDocuments,
  recordDocument,
  signDocument,
} from "@/lib/documents.functions";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/rental";

export function DocumentsTab({
  unitId,
  tenantId,
}: {
  unitId?: string;
  tenantId?: string;
}) {
  const { t } = useTranslation();
  const fetchDocs = useServerFn(listDocuments);
  const record = useServerFn(recordDocument);
  const sign = useServerFn(signDocument);
  const remove = useServerFn(deleteDocument);
  const fileRef = useRef<HTMLInputElement>(null);

  const scope = { unit_id: unitId, tenant_id: tenantId };
  const { data: docs = [], refetch } = useQuery({
    queryKey: ["documents", unitId ?? null, tenantId ?? null],
    queryFn: () => fetchDocs({ data: scope }),
  });

  const [kind, setKind] = useState<DocumentKind>(DOCUMENT_KINDS[0]);
  const [title, setTitle] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error(t("rental.docs.pickFile"));
    setBusy(true);
    try {
      const folder = unitId ?? tenantId ?? "misc";
      const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      await record({
        data: {
          unit_id: unitId ?? null,
          tenant_id: tenantId ?? null,
          kind,
          title: title || file.name,
          file_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          expires_at: expires || null,
        },
      });
      toast.success(t("rental.docs.uploaded"));
      setTitle("");
      setExpires("");
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = async (path: string, bucket: string) => {
    try {
      const { url } = await sign({ data: { path, bucket } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="d-kind">{t("rental.docs.kind")}</Label>
          <select
            id="d-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as DocumentKind)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`rental.docKind.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="d-title">{t("rental.docs.title")}</Label>
          <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>{t("rental.docs.expires")}</Label>
          <DatePicker value={expires} onChange={setExpires} />
        </div>
        <div className="flex items-end gap-2">
          <Input ref={fileRef} type="file" />
          <Button onClick={upload} disabled={busy}>
            {t("rental.docs.upload")}
          </Button>
        </div>
      </div>

      {docs.length === 0 && <p className="text-sm text-muted-foreground">{t("rental.docs.empty")}</p>}

      <ul className="divide-y rounded-lg border">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-muted-foreground">
                {t(`rental.docKind.${d.kind}`)}
                {d.expires_at ? ` · ${t("rental.docs.expires")}: ${d.expires_at}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => open(d.file_path, d.bucket)}>
                {t("rental.docs.open")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(d.id)}>
                {t("common.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
