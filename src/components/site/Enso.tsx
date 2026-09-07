import { cn } from "@/lib/utils";

/**
 * Dharma Stay signature element: a thin, slightly open circle (ensō hint).
 * Reused as section divider, icon frame and accent — never decoratively religious.
 */
export function Enso({
  className,
  strokeWidth = 1,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("h-10 w-10 text-sage", className)}
    >
      <path
        d="M50 6.5a43.5 43.5 0 1 1-12 1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function EnsoDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-6", className)} role="presentation">
      <span className="h-px w-16 bg-clay/50 sm:w-24" />
      <Enso className="h-7 w-7 text-sage/70" />
      <span className="h-px w-16 bg-clay/50 sm:w-24" />
    </div>
  );
}

export function EnsoFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-grid h-16 w-16 place-items-center", className)}>
      <Enso className="absolute inset-0 h-full w-full text-sage/60" />
      <span className="relative">{children}</span>
    </span>
  );
}