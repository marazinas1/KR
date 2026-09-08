# PLAN.md — Revoo Rent build sequence

Each numbered step is one Lovable prompt (Plan mode for anything structural), verified against GitHub before the next one starts. AGENTS.md holds the rules; this file holds the order.

Steps 1 to 6 are what gets demonstrated to Kazimieras and Rapolas. Steps 7 onward come after that meeting, informed by their real data.

---

## 1. Carve-out

Remove everything short-term-specific inherited from `demo-rentals`.

**Delete — public site:** `restobaras`, `sauna`, `banketine-sale`, `dovanu-kuponai`, `namelis`, `laisvi-kambariai`, `rezervacija*`, `home-v2`, `apartamentai*` (all of it — see correction below) and their `/en` mirrors, `src/content/lt/*`, `src/content/en/*`, `src/components/home/*`, `src/components/stay/*` (all of it — see correction below), `src/components/search/*`, `src/components/site/Enso.tsx`, `src/components/site/Logo.tsx`, `src/components/site/BookingDialog.tsx`, `BookingDateRange.tsx`, `booking-context.ts`, `src/lib/property-slug.ts`, `property-category.ts`, `property-view.ts`, `property-queries.ts`, `src/pages/legal.tsx` (the public rules page — reads through `rentivo.functions.ts`/`rentivo-schemas.ts`; a plain terms page can come back cheaply once needed, it does not depend on anything else), every Dharma image asset.

**Correction after inspecting the actual import graph:** the apartment listing grid, `PropertyCard`/`PropertyGrid`/`BookingDialog` and their supporting `property-*.ts` files all fetch data through `rentivo.functions.ts` and are typed by `rentivo-schemas.ts` — they cannot be quarantined as "untouched" while the Rentivo layer is deleted underneath them. Delete the whole module now. Step 5 is a fresh build against `units`/`leases`, not a conversion of this code. Check `PropertyGallery.tsx` individually before deleting it with the rest of `components/stay/` — keep it only if it turns out to have no Rentivo or `@/content` import.

Generic layout pieces in `src/components/site/` that do **not** import Rentivo or `@/content` are kept as-is for step 5 to re-skin: `SiteHeader`, `SiteFooter`, `PageHero`, `ContactForm`, `ContactCta`, `LanguageSwitcher`, `LocaleLink`, `Prose`, `Reveal`.

**Delete — short-term logic:** `rentivo-api.server.ts`, `rentivo.functions.ts`, `rentivo-schemas.ts`, `availability*.ts`, `ical*.ts`, `api/public/ical-sync.ts`, `booking-extras.ts`, `booking-storage.ts`, all `api/public/v1/*` booking and availability endpoints, `admin/bookings*`, the assistant module, and every `RENTIVO_*` reference in `runtime-env.server.ts`. Skip the `RENTIVO_API_KEY` secret prompt if it appears — no value for it exists or ever will.

`booking-pricing.ts` is a special case: `src/lib/api-public.server.ts` (kept, see below) has a type-only import from it (`PriceTierLike`, `ExtraServiceLike`). Either move those two type definitions into `api-public.server.ts` itself before deleting `booking-pricing.ts`, or leave `booking-pricing.ts` in place until step 3 removes the fields that need it. Don't delete it blind — check the build.

**Delete — tables:** `bookings`, `booking_notifications`, `cars`, `car_investments`, `car_maintenance`, `room_status`, `payment_transactions`.

**Do not delete — conversion templates:** `src/routes/_authenticated/staff.*`, `src/lib/staff-api-*.ts`, `src/routes/api/staff/v1/*`, `housekeeping.functions.ts`, `housekeeping.server.ts`, `admin.housekeeping.tsx`. These become the tenant portal in step 5. Mark them with a `// TEMPLATE — converts to tenant portal in step 5` comment.

Keep untouched: auth and `_authenticated` gating, `users.functions.ts` and the invite flow, `image-optimize.ts`, `invoice-pdf.ts`, `invoices.*`, `contracts.functions.ts`, `content-templates.*`, `notifications.server.ts` and `notifications-cron`, `api-auth.server.ts`, `api-keys.functions.ts`, `dashboard.functions.ts`, `KpiCard`, `PeriodFilter`, the settings framework, `expenses`, i18n plumbing, and the whole `components/ui` set. Also keep the public v1 API endpoints that have no Rentivo or content dependency — `api/public/v1/legal.ts`, `payment-details.ts`, `properties.ts`, `properties.$id.ts` — and their shared helper `src/lib/api-public.server.ts`, once its `booking-pricing.ts` import is resolved as above. Also check `sitemap[.]xml.ts`: it currently imports `rentivo-api.server.ts` and `property-category.ts`/`property-slug.ts` (both deleted) and hardcodes several now-deleted paths in `STATIC_PATHS`. Reduce it in this step to the handful of routes that survive step 1 — no property URLs until step 5 adds them back.

**End state:** the project builds and previews cleanly, `/admin` loads, zero references to Dharma, Rentivo, nightly rates, guests, iCal or cars anywhere in code, assets or `.lovable/plan` history.

## 2. Roles and access

Rebuild the `app_role` enum as `developer` / `owner` / `manager` / `tenant` (the base project has legacy `admin`, `administrator`, `housekeeper` values). Update `has_role`, `is_developer`, `is_owner`, add `is_manager` and `is_tenant`. Update `getMyRole` and every RLS policy that referenced the old values. Update the invite flow so an owner can invite `owner` and `manager`, and so a tenant invite is a separate action from the tenant's own record.

Verify every policy individually with a live SQL query. Do not assume the old `is_admin()` covers the new cases.

## 3. Core data model

Create `buildings`, `tenants`, `leases`, `lease_occupants`, `meters`, `meter_readings`, `utility_rates`, `charges`, `payments`, `issues`, `issue_comments`, `rental_inquiries`. Convert `properties` to `units` (add `is_listed`), `property_events` to `unit_events`, `property_documents` to `documents`, `property_settings` to `org_settings` (dropping every short-term column, keeping `display_name` and the rest of the branding fields). Drop `bookings` and the rest listed in step 1.

Note for step 5: the admin shell already reads its wordmark from `display_name` on the settings row (`admin.tsx`, falling back to "Deerva"). When the public site is built, it must read its wordmark from the same `org_settings.display_name` value — not a separate i18n string — so admin and public always show one name, set in one place.

Add the availability computation from AGENTS.md 5.7 as a view or a server function — not a stored column — so the public site in step 5 has one source of truth to read from.

RLS from the start, written per role, `tenant` policies scoped through an active lease, `rental_inquiries` insertable by anyone and readable by staff only (same shape as the `leads` policy in Halliday Architects). Private storage buckets for documents, meter photos and fault photos; public bucket only for unit marketing photos.

## 4. Admin: units, tenants, leases

Unit list built for 100 rows: search, filter by building and status, status badges, empty-since indicator. Unit detail page with tabs — overview, lease and tenant, meters and readings, faults, documents, costs, timeline, and an `is_listed` toggle. Tenant list and tenant detail. Lease create, renew and terminate, with the end-date and renewal-flag logic that drives both the dashboard warnings and the public site in step 5.

## 5. Public vacancy site

A fresh build, not a conversion — the old listing grid was deleted in step 1 because it was wired end-to-end into the Rentivo Core client. New routes and pages under `/butai`, reading units through the step-3 availability view, soonest-available first, filterable by "laisvi dabar" / "laisvi netrukus". A new inquiry form (name, phone, email, desired move-in date, message) writing to `rental_inquiries` — one move-in date field, no date range, no guest counters. Re-skin `SiteHeader`/`SiteFooter`/`PageHero` for this brand — those survived step 1 untouched and don't need rebuilding, only new content and colours. Use the board-metaphor HTML mockup as the visual reference for the homepage hero. A submitted inquiry fires the same notification path used elsewhere in the app and lands in a new "Užklausos" list in the admin, where a manager or owner can mark it contacted, schedule a viewing, or convert it straight into a draft lease against the unit it named.

## 6. Tenant portal

Convert `/staff` into `/nuomininkas`. Role gate on `tenant`, own-lease scoping in the API layer not the UI. Screens: my unit and lease, submit readings (numeric keypad, previous value shown, meter photo), report a fault with photos, fault status thread, my balance and invoices, my documents. Phone-first. Invite flow so a manager can give a tenant a login from the tenant's detail page.

## 7. Dashboard

The morning screen described in AGENTS.md section 7, plus new inquiries from step 5 as one of the cards. Every card links to a filtered list. Build it on the existing `KpiCard` / `PeriodFilter` / dashboard server-function pattern.

**This is the end of the demo scope.** Stop here, show it, and let their Excel and their questions shape everything below.

---

## 8. Billing

Tariffs with effective dates, monthly charge generation from approved readings, invoice generation on the existing numbering-series and PDF engine, payment recording, balance and debt per lease. Bank transfer only — no card processing in v1.

## 9. Contracts

Lease templates on the existing `contract_templates` engine with long-term variables, generation from a lease, PDF, storage in the private bucket, and expiry warnings feeding the dashboard.

## 10. Notifications

On the existing `content_templates` plus `notifications-cron` layer: reading-window reminder, missing-reading chase, lease expiring, payment overdue, fault status change, new inquiry. Every template editable by the owner, every channel toggleable per org.

## 11. Excel import

Bring their existing spreadsheets in: units, tenants, active leases, last known meter readings. Column mapping UI, dry-run preview, then commit. **Ask for the real files on Monday** — this step is designed against their actual columns, not guessed ones.

## 12. Reporting and API

Portfolio reports (occupancy, rent roll, cost per unit, yield per unit against `property_investments`), export to Excel, and the public API namespace kept clean for the future mobile app.

---

## Open questions

**For Kazimieras and Rapolas, on Monday:**

- Bring the Excel files. All of them, unedited.
- How many buildings, and how many units per building? Are dormitory rooms grouped under one address?
- Who pays utilities — tenant directly to the supplier, or through you as a pass-through charge? This decides whether billing is central to the product or peripheral.
- Which meters exist per unit, and are any shared between units? Day/night electricity?
- When in the month are readings collected, and what is the deadline?
- Is rent paid to a bank account, in cash, or both? How is debt tracked today?
- What does a lease actually look like — is there one template, and what is the typical term and notice period?
- Realistically, how many of the 100 tenants would use a phone portal? If the answer is low, the portal stays a bonus and the admin must work fully without it.
- Deposits: held, returned, deducted against damage?
- Do they actually want strangers finding vacant units through a public website and inquiring cold, or do they only ever re-let through people they already know? This decides whether step 5 is a real acquisition channel or a demo-only nicety.

**For Revoo, before step 3:**

- Product name and domain for this branch — used as the wordmark on the public site in step 5. The homepage mockup shown alongside this plan uses the placeholder "Tiesiogiai".
- Does Kazimieras get his own login, or does Rapolas operate a shared owner account?
- Do we want a `technician` role for outside repair contractors, or do faults stay assigned to internal staff only?
