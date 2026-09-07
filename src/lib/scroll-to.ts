/** Smooth-scrolls to an element by id, respecting prefers-reduced-motion. */
export function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

export const AVAILABILITY_SECTION_ID = "laisvos-datos";
