# Step 1 — Carve-out plan

Two things happen when this plan is approved: the two rule documents are replaced verbatim with the uploaded versions, and the short-term rental leftovers are removed. No database work, no conversion work.

## 0. Replace the rule documents

- `AGENTS.md` — overwritten byte-for-byte with the uploaded version (adds the public vacancy site as surface C, section 5.7 computed availability, `rental_inquiries`).
- `PLAN.md` — overwritten byte-for-byte with the uploaded version.

Both were read in full. The HTML mockup was reviewed as visual direction only; nothing from it is copied now — it informs step 5 (dark board panel as the hero element, IBM Plex Sans + Mono, colour only for status, no shadowed card sets, no arrows on buttons).

## 1. Delete — public site

Routes (and their `/en` mirrors): `restobaras`, `sauna`, `banketine-sale`, `dovanu-kuponai`, `namelis`, `laisvi-kambariai`, `rezervacija.patvirtinta`, `home-v2`.
Pages: `src/pages/restobaras.tsx`, `sauna.tsx`, `banketine-sale.tsx`, `dovanu-kuponai.tsx`, `laisvi-kambariai.tsx`, `rezervacija-patvirtinta.tsx`, `home.tsx`, `redirect-to-stays.tsx`.
Folders: `src/content/lt/*`, `src/content/en/*`, `src/content/index.ts`, `src/components/home/*`, `src/components/stay/*`, `src/components/search/*`.
Single files: `src/components/site/Enso.tsx`, `src/components/site/Logo.tsx`.
Assets: every Dharma/Rentivo/Telšiai image in `src/assets` and `public/images` — `logo-dharma.png`, `banketine-sale.*`, `restobaras-*`, `stay-standard/terrace/cottage.*`, `hero-telsiai-lake.*`, `location-telsiai-aerial.*`, plus the leftover car-era assets `hero-car.jpg`, `gearbox-icon.png`, `eva-avatar.jpg`, `demo-video.mp4`, `demo-poster.jpg`, and all seven `rentivo*` plate/logo pointers.

`src/routes/index.tsx` and `src/routes/en/index.tsx` must keep existing, so they are reduced to a neutral placeholder landing page until step 5 replaces them.

## 2. Delete — short-term logic

`rentivo-api.server.ts`, `rentivo.functions.ts`, `rentivo-schemas.ts`, `availability-queries.ts`, `availability-schemas.ts`, `availability.server.ts`, `ical.ts`, `ical.server.ts`, `ical.functions.ts`, `api/public/ical-sync.ts`, `booking-pricing.ts`, `booking-extras.ts`, `booking-storage.ts`, `bookings.functions.ts`, `property-slug.ts`, `property-category.ts`, `property-view.ts`.
Public API: `api/public/v1/availability.ts`, `bookings.ts`, `bookings.$bookingNumber.ts`, `quote.ts` (keep `properties*`, `legal.ts`, `payment-details.ts` for now — they are read endpoints the step-5 site may reuse).
Admin: `admin.bookings.index.tsx`, `admin.bookings.new.tsx`, `admin.bookings.$id.tsx`, `BookingForm.tsx`, `BookingsGantt.tsx`, `BookingsTimeline.tsx`, and their sidebar entries.
Assistant module: `src/components/admin/assistant/*`, `src/routes/api/assistant/chat.ts`, `assistant*.ts` in `src/lib`.
`RENTIVO_*` handling removed from `runtime-env.server.ts` and from the API access card in `settings/ApiAccessSection.tsx`.

## 3. Do not touch — conversion templates

Left exactly as they are, each marked with `// TEMPLATE — converts to <target> in step 5`:

- Public listing grid: `apartamentai*` routes and `/en` mirrors, `src/pages/apartamentai-*.tsx`, `src/components/site/BookingDialog.tsx`, `BookingDateRange.tsx`, `booking-context.ts`.
- Tenant portal source: `staff.tsx`, `staff.index.tsx`, `staff.$id.tsx`, `staff-api-auth.server.ts`, `staff-api-client.ts`, `api/staff/v1/*`, `housekeeping.functions.ts`, `housekeeping.server.ts`, `admin.housekeeping.tsx`.
- Shared layout kept and re-skinned later: `SiteHeader`, `SiteFooter`, `PageHero`, `ContactForm`, `ContactCta`, `LanguageSwitcher`, `LocaleLink`, `Prose`, `Reveal`.

Note: `src/components/stay/*` is on the delete list, but `PropertyCard.tsx`, `PropertyGrid.tsx` and `StaysShell.tsx` are exactly the grid step 5 converts. Proposal: keep those three, delete the rest of the folder (`AvailabilityCalendar`, `CategoryCard`, `PropertyGallery` stays as a gallery, `PropertySections`, `StayFacts`, `StayCrossLinks`). Flagging this as a deviation for approval.

## 4. Extra Dharma/short-term references not listed in PLAN.md

- `src/data/contact.ts` and `src/data/nav.ts` — real Dharma Stay phone, email, address and the restobaras/sauna navigation. Client data hardcoded, forbidden by AGENTS.md 3; reduced to neutral defaults.
- `src/i18n/locales/lt.json` and `en.json` — booking/guest/nightly keys and Dharma copy; pruned of short-term keys, plumbing kept.
- `src/lib/brand.ts`, `src/lib/seo.ts`, `useBrandedTitle.ts` — Dharma wordmark defaults; neutralised.
- `docs/klientines-dalies-promptas.md` and `docs/klientines-dalies-legal-promptas.md` — full Dharma short-term briefs; deleted.
- `README.md` — Dharma description; rewritten to one neutral paragraph.
- `.lovable/plan/*` — seven archived plans naming Dharma/Rentivo. PLAN.md's end state says "zero references ... in plan history", so these are deleted too.
- `migrate.py` at the repo root — leftover script from the base project; deleted.
- Storage bucket `car-images` and legacy tables stay untouched in this step.

## 5. Database

No migration in this step. Table drops (`bookings`, `booking_notifications`, `cars`, `car_investments`, `car_maintenance`, `room_status`, `payment_transactions`) are folded into step 3, where the new schema is created — dropping them now would break admin screens that are still being removed in the same pass. Flagging this as a deviation from PLAN.md step 1 for approval.

## End state

The project builds and previews, `/admin` loads, `/` shows a neutral placeholder, and no Dharma, Rentivo, nightly, guest, iCal or car reference remains in code, assets, docs or plan history.
