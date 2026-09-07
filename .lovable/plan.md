# Step 1 — Carve-out plan (revision 3)

Your audit is confirmed against the code. Nothing is executed yet.

## 0. Rule documents

`AGENTS.md` and `PLAN.md` overwritten byte-for-byte with the corrected uploads. The HTML mockup stays a visual reference for step 5 only.

## 1. Root shell and admin — the breakages that matter most

- `src/routes/__root.tsx`: drop the `BookingProvider` import and its JSX wrapper; replace the unconditional `useLocale()` in `RootShell` with `localeFromPath(useRouterState(s => s.location.pathname))` from `@/lib/locale.ts`.
- `admin.tsx`: remove the `AssistantWidget` import and render line; also remove the now-dead `/admin/bookings` sidebar entry and the hardcoded `demo-rentals.deerva.com` website link.
- `admin.index.tsx`: reduced to a minimal working placeholder (title + a note that the dashboard is rebuilt in step 7), rather than surgically cutting three `BookingsTimeline` blocks.
- `admin.properties.$id.edit.tsx`: remove the iCal field and the `syncPropertyIcal` import.

## 2. Delete — routes and pages

Routes plus `/en` mirrors: `apartamentai*` (all five), `apie`, `apie.index`, `apie.taisykles`, `kontaktai`, `restobaras`, `sauna`, `banketine-sale`, `dovanu-kuponai`, `namelis`, `laisvi-kambariai`, `rezervacija.patvirtinta`, `home-v2`, `taisykles`, `privatumo-politika`.
Pages: all `apartamentai-*.tsx`, `apie-layout.tsx`, `about.tsx`, `rules.tsx`, `kontaktai.tsx`, `legal.tsx`, `restobaras.tsx`, `sauna.tsx`, `banketine-sale.tsx`, `dovanu-kuponai.tsx`, `laisvi-kambariai.tsx`, `rezervacija-patvirtinta.tsx`, `home.tsx`, `redirect-to-stays.tsx` — i.e. all of `src/pages/`.
`src/routes/index.tsx`, `src/routes/en/index.tsx` and `src/routes/en/route.tsx` stay as files but become a neutral placeholder page.

## 3. Delete — components, content, lib

`src/components/stay/*` in full except `PropertyGallery.tsx` (verified: imports only React and lucide-react). `src/components/home/*`, `src/components/search/*`, `src/content/*`.
`src/components/site/`: `Enso.tsx`, `Logo.tsx`, `BookingDialog.tsx`, `BookingDateRange.tsx`, `booking-context.ts`, and the three orphans — `ContactForm.tsx` (only user: `pages/kontaktai.tsx`), `ContactCta.tsx` (only users: restobaras/banketine-sale/dovanu-kuponai), `LegalDocument.tsx` (only user: `pages/legal.tsx`). All three confirmed by a reverse-usage search.
Lib: `rentivo-api.server.ts`, `rentivo.functions.ts`, `rentivo-schemas.ts`, `availability*.ts`, `ical*.ts`, `booking-extras.ts`, `booking-storage.ts`, `bookings.functions.ts`, `property-slug.ts`, `property-category.ts`, `property-view.ts`, `property-queries.ts`, all `assistant*.ts`.
Admin components: `BookingForm.tsx`, `BookingsGantt.tsx`, `BookingsTimeline.tsx`, `assistant/AssistantWidget.tsx`.
Routes: `admin.bookings.*`, `api/assistant/chat.ts`, `api/public/ical-sync.ts`, `api/public/v1/availability.ts`, `bookings.ts`, `bookings.$bookingNumber.ts`, `quote.ts`.
Assets: all Dharma/Telšiai/Rentivo/car-era files in `src/assets` and `public/images`.

**`api/public/v1/legal.ts` stays** — you are right, it reads `contract_templates` through `supabaseAdmin` and has no Rentivo or content dependency. Kept alongside `properties.ts`, `properties.$id.ts`, `payment-details.ts`.

## 4. Kept but genuinely repaired

- `SiteHeader.tsx`, `SiteFooter.tsx`, `PageHero.tsx`: their copy (nav labels, footer text, CTA labels, legal links) moves into `src/i18n/locales/lt.json` and `en.json` as new neutral keys; `useContent()`/`useLocale()` become `useTranslation()` + `localeFromPath()`. The `<Logo>`/`<Enso>` usage becomes a plain text wordmark placeholder, later read from settings. The header's "check dates" CTA and its availability scroll are removed outright.
- `LanguageSwitcher.tsx`, `LocaleLink.tsx`: `useLocale()` → `localeFromPath(pathname)` only.
- `Prose.tsx`, `Reveal.tsx`: no content dependency; kept as-is (both become temporarily unused, which is fine).
- `src/routes/sitemap[.]xml.ts`: confirmed it imports `rentivo-api.server.ts`, `property-category.ts`, `property-slug.ts` and lists deleted paths. Reduced to a static list of surviving routes; unit URLs return in step 5.
- `src/lib/api-public.server.ts`: `PriceTierLike` and `ExtraServiceLike` inlined into it, then `booking-pricing.ts` deleted.
- `.lovable/plan/` archive deleted in full (my grep matched 8 of 24, deleting all removes the argument).
- Neutralised: `src/data/contact.ts`, `nav.ts`, `brand.ts`, `seo.ts`, `useBrandedTitle.ts`, `README.md`; deleted: `docs/klientines-dalies-*.md`, `migrate.py`.

## 5. Kept untouched — conversion templates

`staff.*`, `staff-api-*.ts`, `api/staff/v1/*`, `housekeeping.*`, `admin.housekeeping.tsx`, each marked `// TEMPLATE — converts to tenant portal in step 6`. Auth gating, users/invites, invoices, contracts, content templates, notifications and cron, API auth/keys, dashboard server functions, `KpiCard`, `PeriodFilter`, settings, expenses, i18n plumbing and `components/ui` all stay.

## 6. Database

No migration in this step; the table drops move to step 3 with the new schema.

## 7. Verification — why there is no build result yet

A real build result cannot exist before the deletions happen; running one now just reproduces today's state (`RentivoError: Invalid API key` on the public pages). So verification is part of executing this step, not a precondition:

1. Delete and repair in the order above.
2. Run the production build and report the actual output.
3. Run `rg` for `@/content`, `rentivo`, `booking-`, `ical`, `property-view|property-slug|property-category|property-queries`, `Enso`, `Logo` across `src/` and report zero hits.
4. Load `/`, `/admin`, `/auth` and `/staff` in a headless browser and report the console output for each.

If any of the four turns up something, it is fixed inside the same step before I report back.

## End state

Build and preview clean, `/admin` and `/staff` load, `/` is a neutral placeholder, and no Dharma, Rentivo, nightly, guest, iCal or car reference remains in code, assets, docs or plan history.
