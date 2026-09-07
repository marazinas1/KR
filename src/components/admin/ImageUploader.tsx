import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X, Loader2, AlertCircle, RotateCcw, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadOptimizedToStorage, removeFromStorage } from "@/lib/image-optimize";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  cover: string;
  images: string[];
  onChange: (next: { cover: string; images: string[] }) => void;
  /** Aplankas Storage bucket'e — pvz. automobilio ID arba „new". */
  folder?: string;
};

type PendingItem = {
  id: string;
  name: string;
  status: "processing" | "uploading" | "error";
  error?: string;
  file: File;
};

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const MAX_IMAGES = 50;

export function ImageUploader({ cover, images, onChange, folder = "new" }: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Naujausias snapshot'as, kad lygiagretūs uploadai neperrašytų vienas kito.
  const stateRef = useRef({ cover, images });
  useEffect(() => {
    stateRef.current = { cover, images };
  }, [cover, images]);

  const uploadOne = useCallback(
    async (file: File, id: string) => {
      setPending((p) =>
        p.map((it) => (it.id === id ? { ...it, status: "processing" } : it)),
      );
      try {
        setPending((p) =>
          p.map((it) => (it.id === id ? { ...it, status: "uploading" } : it)),
        );
        const res = await uploadOptimizedToStorage(file, folder);
        const current = stateRef.current;
        const nextImages = [...current.images, res.url];
        const nextCover = current.cover || res.url;
        stateRef.current = { cover: nextCover, images: nextImages };
        onChange({ cover: nextCover, images: nextImages });
        setPending((p) => p.filter((it) => it.id !== id));
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("properties.images.uploadFailed");
        setPending((p) =>
          p.map((it) => (it.id === id ? { ...it, status: "error", error: msg } : it)),
        );
        toast.error(`${file.name}: ${msg}`);
      }
    },
    [onChange, folder],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) {
        toast.error(t("properties.images.onlyImages"));
        return;
      }
      const current = stateRef.current;
      const used = current.images.length + pending.filter((p) => p.status !== "error").length;
      const remaining = MAX_IMAGES - used;
      if (remaining <= 0) {
        toast.error(`Maksimaliai ${MAX_IMAGES} nuotraukos`);
        return;
      }
      let toUpload = arr;
      if (arr.length > remaining) {
        toUpload = arr.slice(0, remaining);
        toast.warning(t("properties.images.onlyFirst", { count: remaining, max: MAX_IMAGES }));
      }
      const items: PendingItem[] = toUpload.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        status: "processing" as const,
        file,
      }));
      setPending((p) => [...p, ...items]);
      items.forEach((it) => void uploadOne(it.file, it.id));
    },
    [uploadOne, pending],
  );


  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const retry = (id: string) => {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    void uploadOne(item.file, id);
  };

  const remove = async (idx: number) => {
    const url = images[idx];
    const next = images.filter((_, i) => i !== idx);
    onChange({ cover: next[0] ?? "", images: next });
    try {
      await removeFromStorage(url);
    } catch {
      // silent — DB atskyrimas jau įvyko
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((u) => u === active.id);
    const newIndex = images.findIndex((u) => u === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(images, oldIndex, newIndex);
    onChange({ cover: next[0] ?? "", images: next });
  };

  const atLimit = images.length + pending.filter((p) => p.status !== "error").length >= MAX_IMAGES;

  return (
    <div className="space-y-3">
      <Label>{t("properties.images.label")}</Label>
      <p className="text-xs text-muted-foreground">
        {t("properties.images.help", { max: MAX_IMAGES })}
      </p>

      <div
        onDragOver={(e) => {
          if (atLimit) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (atLimit) {
            e.preventDefault();
            return;
          }
          onDrop(e);
        }}
        onClick={() => {
          if (atLimit) {
            toast.error(t("properties.images.maxToast", { max: MAX_IMAGES }));
            return;
          }
          inputRef.current?.click();
        }}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center transition",
          atLimit
            ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
            : "cursor-pointer " +
              (dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/40"),
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          disabled={atLimit}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <div className="font-medium">
          {atLimit
            ? t("properties.images.limitReached", { max: MAX_IMAGES })
            : t("properties.images.dropzone")}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {t("properties.images.hint", { max: MAX_IMAGES })}
        </div>
      </div>


      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {it.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  {it.status === "processing" && t("properties.images.optimizing")}
                  {it.status === "uploading" && t("properties.images.uploading")}
                  {it.status === "error" && (it.error || t("properties.images.error"))}
                </div>
              </div>
              {it.status === "error" && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => retry(it.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("properties.images.retry")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPending((p) => p.filter((x) => x.id !== it.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && pending.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("properties.images.empty")}
        </div>
      )}

      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((url, i) => (
                <SortableImage
                  key={url}
                  url={url}
                  index={i}
                  isCover={i === 0}
                  onRemove={() => void remove(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableImage({
  url,
  index,
  isCover,
  onRemove,
}: {
  url: string;
  index: number;
  isCover: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: url,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-lg overflow-hidden border bg-muted touch-none",
        isCover && "ring-2 ring-primary",
        isDragging && "opacity-50 ring-2 ring-primary z-10",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="aspect-[16/10] bg-muted cursor-grab active:cursor-grabbing"
      >
        <img
          src={url}
          alt={t("properties.images.alt", { index: index + 1 })}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover pointer-events-none select-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
          }}
        />
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
          aria-label={t("properties.images.remove")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <span
        className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/90"
        aria-hidden
      >
        <GripVertical className="h-3 w-3" />
        {index + 1}
      </span>
      {isCover && (
        <span className="absolute bottom-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary-foreground">
          {t("properties.images.cover")}
        </span>
      )}
    </div>
  );
}
