/** Booking result handed to the confirmation page via sessionStorage. */
export type StoredBooking = {
  booking_number: string;
  status: string;
  date_from: string;
  date_to: string;
  nights: number;
  total_amount: number;
  currency: string;
  expires_at?: string | null;
  guests?: { adults: number; children: number; infants: number };
  extras?: { name: string; amount?: number }[];
};

export const bookingStorageKey = (bookingNumber: string) => `dharma:booking:${bookingNumber}`;

export function storeBooking(booking: StoredBooking) {
  try {
    window.sessionStorage.setItem(bookingStorageKey(booking.booking_number), JSON.stringify(booking));
  } catch {
    /* storage unavailable — the confirmation page falls back to the number only */
  }
}

export function readStoredBooking(bookingNumber: string): StoredBooking | null {
  try {
    const raw = window.sessionStorage.getItem(bookingStorageKey(bookingNumber));
    return raw ? (JSON.parse(raw) as StoredBooking) : null;
  } catch {
    return null;
  }
}
