# Step 1 — Carve-out plan (revised)

Your import-graph correction is accepted: the listing module cannot be quarantined, so it goes now and step 5 becomes a fresh build. No database changes in this step.

## 0. Replace the rule documents

`AGENTS.md` and `PLAN.md` overwritten byte-for-byte with the corrected uploads (step 5 = fresh build, section 5.7 computed availability, `rental_inquiries`). The HTML mockup stays a visual reference only — dark board panel as the lead element, IBM Plex Sans + Mono, colour reserved for status, no shadowed card sets, no arrows on buttons.

## 1. Delete — public site and the whole listing module

Routes and `/en` mirrors: `apartamentai*` (all five), `restobaras`, `sauna`, `banketine-sale`, `dovanu-kuponai`, `namelis`, `laisvi-kambariai`, `rezervacija.patvirtinta`, `home-v2`, `taisykles`, `privatumo-politika`.
Pages: every `src/pages/apartamentai-*.tsx`, `legal.tsx`, `rules.tsx`, `restobaras.tsx`, `sauna.tsx`, `banketine-sale.tsx`, `dovanu-kuponai.tsx`, `laisvi-kambariai.tsx`, `rezervacija-patvirtinta.tsx`, `home.tsx`, `about.tsx`, `apie-layout.tsx`, `kontaktai.tsx`, `redirect-to-stays.tsx`.
Components: `src/components/stay/*` in full **except** `PropertyGallery.tsx` (verified clean — imports only React and lucide-react; kept as a generic carousel), `src/components/home/*`, `src/components/search/*`, `src/components/site/Enso.tsx`, `Logo.tsx`, `BookingDialog.tsx`, `BookingDateRange.tsx`, `booking-context.ts`.
Content: `src/content/*` in full.
Lib: `property-slug.ts`, `property-category.ts`, `property-view.ts`, `property-queries.ts`.
Assets: all Dharma/Telšiai/Rentivo/car-era files in `src/assets` and `public/images` (`logo-dharma`, `banketine-sale`, `restobaras-*`, `stay-*`, `hero-telsiai-lake`, `location-telsiai-aerial`, `hero-car`, `gearbox-icon`, `eva-avatar`, `demo-video`, `demo-poster`, all seven `rentivo*` pointers).

`src/routes/index.tsx`, `src/routes/en/index.tsx` and `src/routes/en/route.tsx` must keep existing for the router, so they become a neutral placeholder page until step 5 builds the real vacancy site.

## 2. Delete — short-term logic

`rentivo-api.server.ts`, `rentivo.functions.ts`, `rentivo-schemas.ts`, `availability-queries.ts`, `availability-schemas.ts`, `availability.server.ts`, `ical.ts`, `ical.server.ts`, `ical.functions.ts`, `api/public/ical-sync.ts`, `booking-extras.ts`, `booking-storage.ts`, `bookings.functions.ts`.
Public API: `api/public/v1/availability.ts`, `bookings.ts`, `bookings.$bookingNumber.ts`, `quote.ts`, `legal.ts`. Kept: `properties.ts`, `properties.$id.ts`, `payment-details.ts`.
Admin: `admin.bookings.index.tsx`, `admin.bookings.new.tsx`, `admin.bookings.$id.tsx`, `BookingForm.tsx`, `BookingsGantt.tsx`, `BookingsTimeline.tsx`, and their sidebar entries.
Assistant: `src/components/admin/assistant/*`, `src/routes/api/assistant/chat.ts`, all `assistant*.ts` in `src/lib`.
`RENTIVO_*` handling stripped from `runtime-env.server.ts` and from the API access card in `settings/ApiAccessSection.tsx`. This also clears the current preview error (`RentivoError: Invalid API key`).

## 3. Your three extra corrections

1. **`src/routes/sitemap[.]xml.ts`** — confirmed: it imports `rentivo-api.server.ts`, `property-category.ts` and `property-slug.ts`, and its `STATIC_PATHS` lists restobaras, sauna, banketine-sale, dovanu-kuponai. Reduced to a static list of surviving paths only (`/`, `/kontaktai` if kept, `/privatumo-politika` if kept); unit URLs return in step 5.
2. **`src/lib/api-public.server.ts`** — confirmed type-only import of `PriceTierLike` and `ExtraServiceLike` from `booking-pricing.ts`. Those two types are inlined into `api-public.server.ts`, then `booking-pricing.ts` is deleted, and the build is run to confirm. The nightly-specific fields it exposes (`price_per_night`, `max_guests`, `price_tiers`) stay until step 3 reshapes `properties` into `units`.
3. **`.lovable/plan/` archive** — my search matched 8 of the 24 archived plans on Dharma/Rentivo, not 11; rather than argue over the count, the whole `.lovable/plan/` archive is deleted, which satisfies the "zero references in plan history" end state either way.

## 4. Kept untouched — conversion templates

Marked with `// TEMPLATE — converts to tenant portal in step 6`: `staff.tsx`, `staff.index.tsx`, `staff.$id.tsx`, `staff-api-auth.server.ts`, `staff-api-client.ts`, `api/staff/v1/*`, `housekeeping.functions.ts`, `housekeeping.server.ts`, `admin.housekeeping.tsx`.
Kept as-is for step 5 re-skinning: `SiteHeader`, `SiteFooter`, `PageHero`, `ContactForm`, `ContactCta`, `LanguageSwitcher`, `LocaleLink`, `Prose`, `Reveal` — each checked for a `@/content` import first; any that has one gets its copy moved to i18n rather than being deleted.
Untouched: auth and `_authenticated` gating, users/invites, `image-optimize.ts`, invoices and PDF, contracts, content templates, notifications and cron, API auth and keys, dashboard functions, `KpiCard`, `PeriodFilter`, settings framework, expenses, i18n plumbing, `components/ui`.

## 5. Other Dharma leftovers found

`src/data/contact.ts` and `nav.ts` (real phone, email, address, restobaras/sauna nav) neutralised; `src/i18n/locales/*.json` pruned of booking/guest/nightly keys; `src/lib/brand.ts`, `seo.ts`, `useBrandedTitle.ts` neutralised; `docs/klientines-dalies-*.md` and `migrate.py` deleted; `README.md` rewritten to one neutral paragraph.

## 6. Database

No migration here. The table drops (`bookings`, `booking_notifications`, `cars`, `car_investments`, `car_maintenance`, `room_status`, `payment_transactions`) move into step 3 alongside the new schema, so nothing is dropped while admin screens referencing it are still being removed. Flagged as a deviation from PLAN.md for your approval.

## End state

Build and preview are clean, `/admin` loads, `/` shows a neutral placeholder, and no Dharma, Rentivo, nightly, guest, iCal or car reference remains in code, assets, docs or plan history.
