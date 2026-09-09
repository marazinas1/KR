import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { listLeaseTemplates, previewLeaseContract } from "@/lib/contracts.functions";
import { recordDocument } from "@/lib/documents.functions";
import { buildContractPdf } from "@/lib/contract-pdf";

export function ContractDialog({
  open,
  onOpenChange,
  leaseId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaseId: string;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const fetchTemplates = useServerFn(listLeaseTemplates);
  const preview = useServerFn(previewLeaseContract);
  const record = useServerFn(recordDocument);
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["lease-templates"],
    queryFn: () => fetchTemplates(),
    enabled: open,
  });

  useEffect(() => {
    if (!templateId && templates.length) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["lease-contract", leaseId, templateId],
    queryFn: () => preview({ data: { lease_id: leaseId, template_id: templateId } }),
    enabled: open && !!templateId,
  });

  const html = useMemo(() => DOMPurify.sanitize(data?.html ?? ""), [data]);
  const missing = data?.missing ?? [];
  const manual = data?.manual ?? [];
  const blocked = missing.length > 0;

  const makePdf = async () => {
    if (!data) return null;
    return buildContractPdf({
      title: t("contracts.lease.pdfTitle"),
      html: data.html,
      landlordLabel: t("contracts.lease.landlordSign"),
      tenantLabel: t("contracts.lease.tenantSign"),
      signatureHint: t("contracts.lease.signHint"),
      place: "",
    });
  };

  const download = async () => {
    setBusy(true);
    try {
      const doc = await makePdf();
      doc?.save(fileName(data));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const doc = await makePdf();
      if (!doc) return;
      const blob = doc.output("blob");
      const name = fileName(data);
      const path = `${data.meta.unit_id}/${crypto.randomUUID()}-${name}`;
      const up = await supabase.storage
        .from("documents")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (up.error) throw new Error(up.error.message);
      await record({
        data: {
          unit_id: data.meta.unit_id,
          tenant_id: data.meta.tenant_id,
          lease_id: data.meta.lease_id,
          kind: "lease_contract",
          title: name.replace(/\.pdf$/, ""),
          file_path: path,
          mime_type: "application/pdf",
          size_bytes: blob.size,
          expires_at: data.meta.end_date,
        },
      });
      toast.success(t("contracts.lease.saved"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("contracts.lease.title")}</DialogTitle>
          <DialogDescription>{t("contracts.lease.hint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="c-tpl">{t("contracts.lease.template")}</Label>
            <select
              id="c-tpl"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {templates.length === 0 && <option value="">{t("contracts.lease.noTemplates")}</option>}
              {templates.map((tpl: any) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.language.toUpperCase()})
                  {tpl.is_active ? "" : ` — ${t("contracts.inactive")}`}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

          {blocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">{t("contracts.lease.blocked")}</p>
              <ul className="mt-1 list-disc pl-5">
                {missing.map((k: string) => (
                  <li key={k}>{t(`contracts.leaseVars.${k}`)}</li>
                ))}
              </ul>
            </div>
          )}

          {manual.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{t("contracts.lease.manualTitle")}</p>
              <p className="text-muted-foreground">{t("contracts.lease.manualHint")}</p>
              <ul className="mt-1 list-disc pl-5">
                {manual.map((k: string) => (
                  <li key={k}>{t(`contracts.leaseVars.${k}`)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border p-4">
            {isFetching ? (
              <p className="text-sm text-muted-foreground">{t("contracts.loading")}</p>
            ) : (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="outline" onClick={download} disabled={busy || blocked || !data}>
            {t("contracts.lease.download")}
          </Button>
          <Button onClick={save} disabled={busy || blocked || !data}>
            {t("contracts.lease.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fileName(data: any) {
  const safe = (s: string) => (s || "").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "");
  return `sutartis-${safe(data?.meta?.unit_name)}-${safe(data?.meta?.tenant_name)}.pdf`;
}
