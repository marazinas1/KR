import { createContext, useContext } from "react";

import type { ExtraService } from "@/lib/rentivo-schemas";

export type BookingDates = { checkin?: string; checkout?: string; adults?: number };

/** Extra context the property page can pass through (already fetched there). */
export type BookingProperty = {
  name?: string;
  extras?: ExtraService[];
  maxGuests?: number | null;
};

export type BookingContextValue = {
  open: (stayId?: string, dates?: BookingDates, property?: BookingProperty) => void;
};

/**
 * Lives in a component-free module so Fast Refresh never swaps the context
 * identity while <BookingProvider> stays mounted (that produced
 * "useBooking must be used inside <BookingProvider>" in dev).
 */
export const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}
