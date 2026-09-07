import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

/**
 * Atvaizduoja PDF puslapius kaip paveikslėlius (canvas) — veikia ir tada,
 * kai naršyklės įterptasis PDF peržiūros modulis blokuojamas iframe'e.
 */
export function PdfPreview({ data }: { data: Uint8Array | null }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
        if (cancelled) return;
        const host = containerRef.current;
        if (!host) return;
        host.innerHTML = "";

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const scale = 2;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "w-full rounded-md border bg-white shadow-sm";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          host.appendChild(canvas);
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Nepavyko atvaizduoti PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="min-h-[16rem] overflow-y-auto">
      {loading && (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.generatingPreview")}
        </div>
      )}
      {error && <p className="p-4 text-sm text-destructive">{error}</p>}
      <div ref={containerRef} className="flex flex-col gap-3" />
    </div>
  );
}