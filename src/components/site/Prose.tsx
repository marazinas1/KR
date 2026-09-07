import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared text block: one column of calm body copy. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-5 text-base leading-[1.75] text-stone sm:text-lg", className)}>
      {children}
    </div>
  );
}

export function PageSection({
  children,
  className,
  tone = "warm",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "warm" | "linen";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-20 lg:px-12 lg:py-24",
        tone === "warm" ? "bg-warm-white" : "bg-linen",
        className,
      )}
    >
      <div className="mx-auto max-w-[84rem]">{children}</div>
    </section>
  );
}