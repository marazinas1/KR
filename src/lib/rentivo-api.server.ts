import { getRequestHost } from "@tanstack/react-start/server";

import {
  bookingInputSchema,
  bookingResponseSchema,
  bookingStatusResponseSchema,
  legalResponseSchema,
  paymentDetailsResponseSchema,
  propertiesResponseSchema,
  propertyDetailResponseSchema,
  quoteInputSchema,
  quoteResponseSchema,
  type BookingInput,
  type LegalDocument,
  type LegalKind,
  type QuoteInput,
} from "@/lib/rentivo-schemas";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { resolveRentivoConfig } from "@/lib/runtime-env.server";

/** Server-only Core (Rentivo) API client. The API key never leaves this module. */
export class RentivoError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "RentivoError";
    this.code = code;
    this.status = status;
  }
}

function currentHost(): string | null {
  try {
    return getRequestHost() ?? null;
  } catch {
    return null;
  }
}

async function rentivoFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { baseUrl, apiKey } = resolveRentivoConfig(currentHost());

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    console.error("[rentivo] network error", path, error);
    throw new RentivoError("network_error", 0);
  }

  const text = await response.text();
  let payload: unknown = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const code =
      (payload as { error?: { code?: string } } | undefined)?.error?.code ?? "unknown_error";
    const message = (payload as { error?: { message?: string } } | undefined)?.error?.message;
    console.error("[rentivo] api error", path, response.status, code, message);
    throw new RentivoError(code, response.status, message);
  }

  return payload;
}

function parseOrThrow<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } },
  payload: unknown,
  path: string,
): T {
  const result = schema.safeParse(payload);
  if (!result.success || result.data === undefined) {
    console.error("[rentivo] invalid response", path, JSON.stringify(result.error));
    throw new RentivoError("invalid_response", 502);
  }
  return result.data;
}

/** The engine ignores unknown query params, so sending `language` is safe. */
function languageQuery(language?: string): string {
  return language && language !== "lt" ? `?language=${encodeURIComponent(language)}` : "";
}

export async function fetchProperties(language?: string) {
  const payload = await rentivoFetch(`/properties${languageQuery(language)}`);
  return parseOrThrow(propertiesResponseSchema, payload, "/properties").data;
}

export async function fetchProperty(id: string, language?: string) {
  const payload = await rentivoFetch(
    `/properties/${encodeURIComponent(id)}${languageQuery(language)}`,
  );
  return parseOrThrow(propertyDetailResponseSchema, payload, "/properties/:id").data;
}

/* ---- Ready for Phase 2, not wired to the UI yet ---- */

export async function fetchQuote(input: QuoteInput) {
  const body = quoteInputSchema.parse(input);
  const payload = await rentivoFetch("/quote", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(quoteResponseSchema, payload, "/quote").data;
}

export async function createBooking(input: BookingInput) {
  const body = bookingInputSchema.parse(input);
  const payload = await rentivoFetch("/bookings", { method: "POST", body: JSON.stringify(body) });
  return parseOrThrow(bookingResponseSchema, payload, "/bookings").data;
}

export async function fetchPaymentDetails() {
  const payload = await rentivoFetch("/payment-details");
  return parseOrThrow(paymentDetailsResponseSchema, payload, "/payment-details").data;
}

export async function fetchBookingStatus(bookingNumber: string, email: string) {
  const payload = await rentivoFetch(
    `/bookings/${encodeURIComponent(bookingNumber)}?email=${encodeURIComponent(email)}`,
  );
  return parseOrThrow(bookingStatusResponseSchema, payload, "/bookings/:number").data;
}

/* ---- Legal documents (rental terms, privacy policy) ---- */

export type ContactMessage = {
  name: string;
  email: string;
  phone?: string | undefined;
  message: string;
};

/**
 * Core does not expose a contact endpoint yet. The single place to point at it
 * once it exists — until then the caller falls back to the e-mail link.
 */
export async function sendContactMessage(input: ContactMessage): Promise<{ delivered: boolean }> {
  try {
    await rentivoFetch("/contact", { method: "POST", body: JSON.stringify(input) });
    return { delivered: true };
  } catch (error) {
    if (error instanceof RentivoError && (error.status === 404 || error.status === 405)) {
      return { delivered: false };
    }
    throw error;
  }
}

const LEGAL_TTL_MS = 5 * 60 * 1000;
const legalCache = new Map<string, { at: number; doc: LegalDocument }>();

/**
 * The engine only publishes templates for languages it has been configured for,
 * and answers 404 `Active template not found` otherwise. Fall back to the
 * Lithuanian original, then to `null`, so the page renders its own notice
 * instead of failing the whole route.
 */
export async function fetchLegal(
  kind: LegalKind,
  language = "lt",
): Promise<LegalDocument | null> {
  const key = `${kind}:${language}`;
  const cached = legalCache.get(key);
  if (cached && Date.now() - cached.at < LEGAL_TTL_MS) return cached.doc;

  let payload: unknown;
  try {
    payload = await rentivoFetch(
      `/legal?kind=${encodeURIComponent(kind)}&language=${encodeURIComponent(language)}`,
    );
  } catch (error) {
    const missing = error instanceof RentivoError && error.status === 404;
    if (!missing) throw error;
    return language === "lt" ? null : fetchLegal(kind, "lt");
  }
  const raw = parseOrThrow(legalResponseSchema, payload, "/legal").data;
  const doc: LegalDocument = {
    kind: raw.kind,
    name: raw.name ?? "",
    html: sanitizeHtml(raw.content ?? ""),
    updated_at: raw.updated_at ?? null,
  };
  legalCache.set(key, { at: Date.now(), doc });
  return doc;
}