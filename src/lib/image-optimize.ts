import { supabase } from "@/integrations/supabase/client";

const MAX_DIMENSION = 1200;
const MAX_BYTES = 200 * 1024;
const QUALITY_STEPS = [0.8, 0.75, 0.7, 0.65, 0.55];

export type OptimizedImage = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nepavyko įkelti nuotraukos"));
    img.src = src;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Nepavyko konvertuoti į WebP"))),
      "image/webp",
      quality,
    );
  });
}

/**
 * Optimizuoja nuotrauką naršyklėje:
 *  - Sumažina iki max 1200px pločio/aukščio išlaikant proporcijas.
 *  - Konvertuoja į WebP formatą.
 *  - Iteratyviai mažina kokybę kol dydis ≤ 200 KB (arba pasiekiama 0.55 riba).
 */
export async function optimizeImage(source: Blob | File): Promise<OptimizedImage> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl);
    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;
    if (targetW <= 0 || targetH <= 0) {
      throw new Error("Nekorektiška nuotrauka");
    }
    const largest = Math.max(targetW, targetH);
    if (largest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / largest;
      targetW = Math.round(targetW * scale);
      targetH = Math.round(targetH * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas kontekstas nepasiekiamas");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let best: Blob | null = null;
    for (const q of QUALITY_STEPS) {
      const blob = await canvasToWebp(canvas, q);
      best = blob;
      if (blob.size <= MAX_BYTES) break;
    }
    if (!best) throw new Error("WebP konvertavimas nepavyko");
    return { blob: best, width: targetW, height: targetH, bytes: best.size };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Įkelia optimizuotą WebP į `car-images` bucket'ą ir grąžina public URL. */
export async function uploadOptimizedToStorage(
  source: Blob | File,
  folder: string,
): Promise<{ url: string; path: string; width: number; height: number; bytes: number }> {
  const optimized = await optimizeImage(source);
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
  const path = `${safeFolder}/${uuid}.webp`;

  const { error } = await supabase.storage.from("car-images").upload(path, optimized.blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("car-images").getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    width: optimized.width,
    height: optimized.height,
    bytes: optimized.bytes,
  };
}

/** Bandys ištraukti storage path iš public URL. Jei ne šio bucket'o — grąžina null. */
export function extractCarImagesPath(url: string): string | null {
  const marker = "/storage/v1/object/public/car-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function removeFromStorage(url: string): Promise<void> {
  const path = extractCarImagesPath(url);
  if (!path) return;
  await supabase.storage.from("car-images").remove([path]);
}
