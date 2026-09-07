import logoUrlAsset from "@/assets/logo-dharma.png.asset.json";
const logoUrl = logoUrlAsset.url;
import { cn } from "@/lib/utils";

/**
 * Dharma Stay badge logo. The source PNG carries the mark in its alpha channel,
 * so it is painted with `currentColor` via a CSS mask — one file, any color.
 */
export function Logo({ className, title = "Dharma Stay" }: { className?: string; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn("block aspect-square bg-current", className)}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
