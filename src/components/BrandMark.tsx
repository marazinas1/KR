import { cn } from "@/lib/utils";

/**
 * The ONE brand lockup, used everywhere the product shows its identity:
 * admin sidebar, sign-in screen, public site header.
 *
 * Rule (white-label): if the owner uploads a logo in Settings
 * (org_settings.brand_logo_url), every surface shows that image and nothing
 * else. Until then, show the two-line text lockup: display name + tagline
 * (both from org_settings). No client-specific fallback images — never
 * hardcode a logo file here.
 */
export function BrandMark({
  displayName,
  tagline,
  logoUrl,
  size = "sm",
  className,
}: {
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  /** sm = compact header/sidebar lockup; lg = sign-in hero. */
  size?: "sm" | "lg";
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={displayName}
        className={cn(
          "w-auto object-contain",
          size === "lg" ? "max-h-40 max-w-[22rem]" : "max-h-9 max-w-44",
          className,
        )}
      />
    );
  }

  return (
    <span className={cn("flex flex-col leading-tight", className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight text-current",
          size === "lg" ? "text-3xl" : "text-base",
        )}
      >
        {displayName}
      </span>
      {tagline ? (
        <span
          className={cn(
            "font-mono font-medium uppercase tracking-[0.18em] text-current opacity-60",
            size === "lg" ? "mt-1.5 text-xs" : "mt-0.5 text-[10px]",
          )}
        >
          {tagline}
        </span>
      ) : null}

    </span>
  );
}
