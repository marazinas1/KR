import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { listMyDocuments, signMyPhoto } from "@/lib/tenant-portal.functions";

export const Route = createFileRoute("/_authenticated/nuomininkas/dokumentai")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const fetchDocs = useServerFn(listMyDocuments);
  const sign = useServerFn(signMyPhoto);
  const { data = [], isLoading } = useQuery({ queryKey: ["my-documents"], queryFn: () => fetchDocs() });

  const open = async (d: { file_path: string; bucket: string }) => {
    try {
      const { url } = await sign({ data: { path: d.file_path, bucket: "documents" } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("tenant.myDocuments")}</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : data.length === 0 ? (
        <div className="rounded-xl border bg-background p-5 text-sm">{t("tenant.noDocuments")}</div>
      ) : (
        <ul className="space-y-2">
          {data.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => open(d)}
                className="flex w-full items-center gap-3 rounded-xl border bg-background p-4 text-left"
              >
                <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`rental.docKind.${d.kind}`)}
                    {d.expires_at
                      ? ` · ${t("tenant.expires", { date: new Date(d.expires_at).toLocaleDateString(i18n.language) })}`
                      : ""}
                  </span>
                </span>
                <span className="text-xs text-primary">{t("tenant.open")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
