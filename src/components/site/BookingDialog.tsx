import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";

import {
  BookingContext,
  type BookingDates,
  type BookingProperty,
} from "@/components/site/booking-context";
import { BookingDateRange } from "@/components/site/BookingDateRange";
import { Enso } from "@/components/site/Enso";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocaleLink } from "@/components/site/LocaleLink";
import { getContent, useContent, useLocale } from "@/content";
import { localizePath } from "@/lib/locale";
import { storeBooking } from "@/lib/booking-storage";
import { propertiesQueryFor } from "@/lib/property-queries";
import { formatPrice } from "@/lib/property-view";
import type { ExtraService } from "@/lib/rentivo-schemas";
import { createBookingFn, getProperty, getQuote } from "@/lib/rentivo.functions";

export type { BookingDates, BookingProperty } from "@/components/site/booking-context";
export { useBooking } from "@/components/site/booking-context";

const UUID_RE = /^[0-9a-f-]{36}$/i;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type Common = ReturnType<typeof getContent>["common"];

function quoteErrorMessage(error: unknown, common: Common): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("too_many_guests")) return common.booking.tooManyGuests;
  if (message.includes("not_found")) return common.booking.notFound;
  if (message.includes("bad_request")) return common.booking.badRequest;
  return common.booking.genericError;
}

function bookingErrorMessage(error: unknown, common: Common): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("dates_unavailable")) return common.booking.datesUnavailable;
  if (message.includes("too_many_guests")) return common.booking.tooManyGuests;
  if (message.includes("not_found")) return common.booking.notFound;
  if (message.includes("bad_request")) return common.booking.badRequest;
  return common.booking.submitError;
}

const contactSchemaFor = (common: Common) =>
  z.object({
    customer_name: z
      .string()
      .trim()
      .min(2, common.booking.nameError)
      .max(200, common.booking.nameError),
    customer_email: z
      .string()
      .trim()
      .email(common.booking.emailError)
      .max(255, common.booking.emailError),
    customer_phone: z
      .string()
      .trim()
      .min(5, common.booking.phoneError)
      .max(50, common.booking.phoneError),
  });

const companySchemaFor = (common: Common) =>
  z.object({
    company_name: z.string().trim().min(2, common.booking.companyNameError).max(200),
    company_code: z.string().trim().min(2, common.booking.companyCodeError).max(50),
    company_vat_code: z.string().trim().max(50).optional(),
    company_address: z.string().trim().min(4, common.booking.companyAddressError).max(300),
  });

type ContactErrors = Partial<
  Record<
    | keyof z.infer<ReturnType<typeof contactSchemaFor>>
    | keyof z.infer<ReturnType<typeof companySchemaFor>>,
    string
  >
>;

function TextField({
  label,
  type = "text",
  value,
  error,
  autoComplete,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  error?: string | undefined;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="label-caps text-stone">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-md border border-border bg-linen px-4 py-3 text-sm text-ink"
      />
      {error ? <span className="block text-xs text-stone">{error}</span> : null}
    </label>
  );
}

function extraHint(extra: ExtraService, common: Common): string | null {
  if (typeof extra.pricePerDay !== "number") return null;
  const unit =
    extra.calc === "per_person"
      ? common.booking.perPerson
      : extra.calc === "per_child"
        ? common.booking.perChild
        : common.booking.flatPerDay;
  return `${formatPrice(extra.pricePerDay)} € ${unit}`;
}

function GuestField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="label-caps text-stone">{label}</span>
      <input
        type="number"
        min={min}
        max={50}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? Math.min(50, Math.max(min, Math.trunc(next))) : min);
        }}
        className="w-full rounded-md border border-border bg-linen px-4 py-3 text-sm text-ink"
      />
    </label>
  );
}

type QuoteData = {
  nights: number;
  nightly_rate: number;
  stay_total: number;
  extras: { name: string; amount: number }[];
  extras_total: number;
  total: number;
  currency: string;
};

function PriceBreakdown({ quote }: { quote: QuoteData }) {
  const { common } = useContent();
  const currency = quote.currency === "EUR" ? "€" : quote.currency;
  return (
    <dl className="space-y-2 text-sm text-stone">
      <Row
        label={`${common.booking.nights}: ${quote.nights} × ${formatPrice(quote.nightly_rate)} ${currency}`}
        value={`${formatPrice(quote.stay_total)} ${currency}`}
      />
      {quote.extras.map((extra) => (
        <Row
          key={extra.name}
          label={extra.name}
          value={`${formatPrice(extra.amount)} ${currency}`}
        />
      ))}
      {quote.extras_total > 0 ? (
        <Row
          label={common.booking.extrasTotal}
          value={`${formatPrice(quote.extras_total)} ${currency}`}
        />
      ) : null}
      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <dt className="label-caps text-sage">{common.booking.total}</dt>
        <dd className="font-display text-2xl font-medium text-ink">
          {formatPrice(quote.total)} {currency}
        </dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/**
 * Booking UI shell. Structure only — availability, pricing and payment come from
 * the booking engine (core) API in a later phase. No external redirects.
 */
export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stayId, setStayId] = useState<string>("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [children_, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [property, setProperty] = useState<BookingProperty | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [isCompany, setIsCompany] = useState(false);
  const [company, setCompany] = useState({
    company_name: "",
    company_code: "",
    company_vat_code: "",
    company_address: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [contact, setContact] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
  });
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const locale = useLocale();
  const { common } = useContent();

  /** Only needed when the dialog is opened without a property context. */
  const propertyOptions = useQuery({
    ...propertiesQueryFor(locale),
    enabled: isOpen && !property,
  });

  const occupancy = useQuery({
    queryKey: ["property-occupancy", stayId, locale] as const,
    enabled: isOpen && UUID_RE.test(stayId),
    staleTime: 60_000,
    retry: false,
    queryFn: () => getProperty({ data: { id: stayId, language: locale } }),
  });

  const open = useCallback((id?: string, dates?: BookingDates, prop?: BookingProperty) => {
    if (id) setStayId(id);
    if (dates) {
      setCheckin(dates.checkin ?? "");
      setCheckout(dates.checkout ?? "");
      setAdults(dates.adults && dates.adults >= 1 ? dates.adults : 2);
    } else {
      setAdults(2);
    }
    setProperty(prop ?? null);
    setSelectedExtras([]);
    setSubmitError(null);
    setContactErrors({});
    setAcceptedTerms(false);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  const extras = property?.extras ?? [];
  const isProperty = UUID_RE.test(stayId);
  const datesValid = Boolean(checkin && checkout && checkout > checkin);
  const canQuote = isProperty && datesValid && adults >= 1;

  const quoteKey = useDebounced(
    JSON.stringify({ stayId, checkin, checkout, adults, children_, infants, selectedExtras }),
    450,
  );

  const quote = useQuery({
    queryKey: ["quote", quoteKey, locale],
    enabled: canQuote,
    retry: false,
    staleTime: 60_000,
    queryFn: () =>
      getQuote({
        data: {
          property_id: stayId,
          date_from: checkin,
          date_to: checkout,
          adults,
          children: children_,
          infants,
          extras: selectedExtras.map((name) => ({ name })),
          language: locale,
        },
      }),
  });

  const canSubmit =
    canQuote && quote.data?.available !== false && !isSubmitting && acceptedTerms;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    const parsed = contactSchemaFor(common).safeParse(contact);
    const parsedCompany = isCompany ? companySchemaFor(common).safeParse(company) : null;
    if (!parsed.success || (parsedCompany && !parsedCompany.success)) {
      const errors: ContactErrors = {};
      const issues = [
        ...(parsed.success ? [] : parsed.error.issues),
        ...(parsedCompany && !parsedCompany.success ? parsedCompany.error.issues : []),
      ];
      for (const issue of issues) {
        const key = issue.path[0] as keyof ContactErrors;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setContactErrors(errors);
      return;
    }
    setContactErrors({});

    if (!acceptedTerms) {
      setSubmitError(common.booking.consentError);
      return;
    }

    if (!canQuote) {
      setSubmitError(common.booking.needQuote);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBookingFn({
        data: {
          property_id: stayId,
          date_from: checkin,
          date_to: checkout,
          adults,
          children: children_,
          infants,
          extras: selectedExtras.map((name) => ({ name })),
          ...parsed.data,
          accepted_terms: true,
          is_company: isCompany,
          language: locale,
          ...(isCompany && parsedCompany?.success ? parsedCompany.data : {}),
        },
      });
      storeBooking({
        booking_number: result.booking_number,
        status: result.status,
        date_from: result.date_from,
        date_to: result.date_to,
        nights: result.nights,
        total_amount: result.total_amount,
        currency: result.currency,
        expires_at: result.expires_at ?? null,
        guests: { adults, children: children_, infants },
        extras: selectedExtras.map((name) => ({ name })),
      });
      setIsOpen(false);
      await navigate({
        to: localizePath("/rezervacija/patvirtinta", locale),
        search: { nr: result.booking_number },
      } as never);
    } catch (error) {
      setSubmitError(bookingErrorMessage(error, common));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border-border bg-warm-white p-0 sm:max-w-lg">
          <div className="p-6 sm:p-8">
            <DialogHeader className="space-y-3 text-left">
              <Enso className="h-8 w-8" />
              <DialogTitle className="font-display text-2xl font-medium text-ink">
                {common.booking.dialogTitle}
              </DialogTitle>
              <DialogDescription className="text-stone">
                {common.booking.dialogDescription}
              </DialogDescription>
            </DialogHeader>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <span className="label-caps text-stone">{common.stays.availabilityTitle}</span>
                <BookingDateRange
                  occupied={occupancy.data?.occupied ?? []}
                  checkin={checkin}
                  checkout={checkout}
                  isLoading={occupancy.isFetching}
                  onChange={(from, to) => {
                    setCheckin(from);
                    setCheckout(to);
                  }}
                />
              </div>

              <div className="block space-y-2">
                <span className="label-caps text-stone">{common.booking.stayLabel}</span>
                {property ? (
                  <p className="w-full rounded-md border border-border bg-linen px-4 py-3 text-sm text-ink">
                    {property?.name ?? common.nav.stays}
                  </p>
                ) : (
                  <select
                    name="stay"
                    value={stayId}
                    onChange={(event) => setStayId(event.target.value)}
                    className="w-full rounded-md border border-border bg-linen px-4 py-3 text-sm text-ink"
                  >
                    <option value="">{common.stays.pickProperty}</option>
                    {(propertyOptions.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <GuestField
                  label={common.booking.adults}
                  value={adults}
                  min={1}
                  onChange={setAdults}
                />
                <GuestField
                  label={common.booking.children}
                  value={children_}
                  min={0}
                  onChange={setChildren}
                />
                <GuestField
                  label={common.booking.infants}
                  value={infants}
                  min={0}
                  onChange={setInfants}
                />
              </div>

              {extras.length ? (
                <fieldset className="space-y-3">
                  <legend className="label-caps text-stone">{common.booking.extras}</legend>
                  {extras.slice(0, 20).map((extra) => {
                    const hint = extraHint(extra, common);
                    const checked = selectedExtras.includes(extra.name);
                    return (
                      <label
                        key={extra.name}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-linen px-4 py-3"
                      >
                        <span className="flex items-center gap-3 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSelectedExtras((current) =>
                                event.target.checked
                                  ? [...current, extra.name]
                                  : current.filter((name) => name !== extra.name),
                              )
                            }
                            className="h-4 w-4 accent-[var(--color-sage,#5A6B5D)]"
                          />
                          {extra.name}
                        </span>
                        {hint ? <span className="text-xs text-stone">{hint}</span> : null}
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}

              <div aria-live="polite" className="rounded-md bg-linen p-5">
                {!canQuote ? (
                  <p className="text-sm text-stone">{common.booking.pickDatesPrompt}</p>
                ) : quote.isPending || quote.isFetching ? (
                  <p className="text-sm text-stone">{common.booking.calculating}</p>
                ) : quote.isError ? (
                  <p className="text-sm text-stone">{quoteErrorMessage(quote.error, common)}</p>
                ) : quote.data && quote.data.available === false ? (
                  <p className="text-sm text-stone">{common.booking.unavailable}</p>
                ) : quote.data ? (
                  <PriceBreakdown quote={quote.data} />
                ) : null}
              </div>

              <fieldset className="space-y-4">
                <legend className="label-caps text-stone">{common.booking.contactTitle}</legend>
                <TextField
                  label={common.booking.name}
                  value={contact.customer_name}
                  autoComplete="name"
                  error={contactErrors.customer_name}
                  onChange={(value) => setContact((c) => ({ ...c, customer_name: value }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={common.booking.email}
                    type="email"
                    value={contact.customer_email}
                    autoComplete="email"
                    error={contactErrors.customer_email}
                    onChange={(value) => setContact((c) => ({ ...c, customer_email: value }))}
                  />
                  <TextField
                    label={common.booking.phone}
                    type="tel"
                    value={contact.customer_phone}
                    autoComplete="tel"
                    error={contactErrors.customer_phone}
                    onChange={(value) => setContact((c) => ({ ...c, customer_phone: value }))}
                  />
                </div>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-linen px-4 py-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isCompany}
                  onChange={(event) => setIsCompany(event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-sage,#5A6B5D)]"
                />
                {common.booking.companyToggle}
              </label>

              {isCompany ? (
                <fieldset className="space-y-4">
                  <legend className="label-caps text-stone">{common.booking.companyTitle}</legend>
                  <TextField
                    label={common.booking.companyName}
                    value={company.company_name}
                    autoComplete="organization"
                    error={contactErrors.company_name}
                    onChange={(value) => setCompany((c) => ({ ...c, company_name: value }))}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label={common.booking.companyCode}
                      value={company.company_code}
                      error={contactErrors.company_code}
                      onChange={(value) => setCompany((c) => ({ ...c, company_code: value }))}
                    />
                    <TextField
                      label={common.booking.companyVat}
                      value={company.company_vat_code}
                      error={contactErrors.company_vat_code}
                      onChange={(value) => setCompany((c) => ({ ...c, company_vat_code: value }))}
                    />
                  </div>
                  <TextField
                    label={common.booking.companyAddress}
                    value={company.company_address}
                    autoComplete="street-address"
                    error={contactErrors.company_address}
                    onChange={(value) => setCompany((c) => ({ ...c, company_address: value }))}
                  />
                </fieldset>
              ) : null}

              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-sage,#5A6B5D)]"
                />
                <span>
                  {common.booking.consentPrefix}{" "}
                  <LocaleLink
                    to="/taisykles"
                    target="_blank"
                    className="text-sage underline underline-offset-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {common.booking.consentTerms}
                  </LocaleLink>{" "}
                  {common.booking.consentAnd}{" "}
                  <LocaleLink
                    to="/privatumo-politika"
                    target="_blank"
                    className="text-sage underline underline-offset-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {common.booking.consentPrivacy}
                  </LocaleLink>
                  .
                </span>
              </label>

              {submitError ? (
                <p role="alert" className="rounded-md bg-linen p-4 text-sm text-ink">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-sage px-6 py-3.5 text-sm font-medium text-warm-white disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-warm-white/40 border-t-warm-white"
                  />
                ) : null}
                {isSubmitting ? common.booking.submitting : common.booking.submit}
              </button>
              <p className="text-center text-xs text-stone">
                {common.booking.noCommissionNote}
              </p>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </BookingContext.Provider>
  );
}