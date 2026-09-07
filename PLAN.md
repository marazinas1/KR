# PLAN.md — Revoo Rent build sequence

Each numbered step is one Lovable prompt (Plan mode for anything structural), verified against GitHub before the next one starts. AGENTS.md holds the rules; this file holds the order.

Steps 1 to 6 are what gets demonstrated to Kazimieras and Rapolas. Steps 7 onward come after that meeting, informed by their real data.

---

## 1. Carve-out

Remove everything short-term-specific inherited from `demo-rentals`.

**Delete — public site:** every public marketing route and its `/en` mirror (`apartamentai*`, `restobaras`, `sauna`, `banketine-sale`, `dovanu-kuponai`, `namelis`, `laisvi-kambariai`, `rezervacija*`, `home-v2`), `src/content/lt/*`, `src/content/en/*`, `src/components/site/*`, `src/components/home/*`, `src/components/stay/*`, `src/components/search/*`, every Dharma asset and the Enso mark.

**Delete — short-term logic:** `rentivo-api.server.ts`, `rentivo.functions.ts`, `rentivo-schemas.ts`, `availability*.ts`, `ical*.ts`, `api/public/ical-sync.ts`, `booking-pricing.ts`, `booking-extras.ts`, `booking-storage.ts`, `property-slug.ts`, `property-category.ts`, `property-view.ts`, all `api/public/v1/*` booking and availability endpoints, `admin/bookings*`, the assistant module, and every `RENTIVO_*` reference in `runtime-env.server.ts`. Skip the `RENTIVO_API_KEY` secret prompt if it appears — no value for it exists or ever will.

**Delete — tables:** `bookings`, `booking_notifications`, `cars`, `car_investments`, `car_maintenance`, `room_status`, `payment_transactions`.

**Do not delete — conversion templates:** `src/routes/_authenticated/staff.*`, `src/lib/staff-api-*.ts`, `src/routes/api/staff/v1/*`, `housekeeping.functions.ts`, `housekeeping.server.ts`, `admin.housekeeping.tsx`. These become the tenant portal in step 5. Mark them with a `// TEMPLATE — converts to tenant portal in step 5` comment.

Keep untouched: auth and `_authenticated` gating, `users.functions.ts` and the invite flow, `image-optimize.ts`, `invoice-pdf.ts`, `invoices.*`, `contracts.functions.ts`, `content-templates.*`, `notifications.server.ts` and `notifications-cron`, `api-auth.server.ts`, `api-keys.functions.ts`, `dashboard.functions.ts`, `KpiCard`, `PeriodFilter`, the settings framework, `expenses`, i18n plumbing, and the whole `components/ui` set.

**End state:** the project builds and previews cleanly, `/admin` loads, zero references to Dharma, Rentivo, nightly rates, guests, iCal or cars anywhere in code, assets or `.lovable/plan` history.

## 2. Roles and access

Rebuild the `app_role` enum as `developer` / `owner` / `manager` / `tenant` (the base project has legacy `admin`, `administrator`, `housekeeper` values). Update `has_role`, `is_developer`, `is_owner`, add `is_manager` and `is_tenant`. Update `getMyRole` and every RLS policy that referenced the old values. Update the invite flow so an owner can invite `owner` and `manager`, and so a tenant invite is a separate action from the tenant's own record.

Verify every policy individually with a live SQL query. Do not assume the old `is_admin()` covers the new cases.

## 3. Core data model

Create `buildings`, `tenants`, `leases`, `lease_occupants`, `meters`, `meter_readings`, `utility_rates`, `charges`, `payments`, `issues`, `issue_comments`. Convert `properties` to `units`, `property_events` to `unit_events`, `property_documents` to `documents`, `property_settings` to `org_settings` (dropping every short-term column). Drop `bookings` and the rest listed in step 1.

RLS from the start, written per role, `tenant` policies scoped through an active lease. Private storage buckets for documents, meter photos and fault photos; public bucket only for unit marketing photos.

## 4. Admin: units, tenants, leases

Unit list built for 100 rows: search, filter by building and status, status badges, empty-since indicator. Unit detail page with tabs — overview, lease and tenant, meters and readings, faults, documents, costs, timeline. Tenant list and tenant detail. Lease create, renew and terminate, with the end-date logic that drives the dashboard warnings.

## 5. Tenant portal

Convert `/staff` into `/nuomininkas`. Role gate on `tenant`, own-lease scoping in the API layer not the UI. Screens: my unit and lease, submit readings (numeric keypad, previous value shown, meter photo), report a fault with photos, fault status thread, my balance and invoices, my documents. Phone-first. Invite flow so a manager can give a tenant a login from the tenant's detail page.

## 6. Dashboard

The morning screen described in AGENTS.md section 7. Every card links to a filtered list. Build it on the existing `KpiCard` / `PeriodFilter` / dashboard server-function pattern.

**This is the end of the demo scope.** Stop here, show it, and let their Excel and their questions shape everything below.

---

## 7. Billing

Tariffs with effective dates, monthly charge generation from approved readings, invoice generation on the existing numbering-series and PDF engine, payment recording, balance and debt per lease. Bank transfer only — no card processing in v1.

## 8. Contracts

Lease templates on the existing `contract_templates` engine with long-term variables, generation from a lease, PDF, storage in the private bucket, and expiry warnings feeding the dashboard.

## 9. Notifications

On the existing `content_templates` plus `notifications-cron` layer: reading-window reminder, missing-reading chase, lease expiring, payment overdue, fault status change. Every template editable by the owner, every channel toggleable per org.

## 10. Excel import

Bring their existing spreadsheets in: units, tenants, active leases, last known meter readings. Column mapping UI, dry-run preview, then commit. **Ask for the real files on Monday** — this step is designed against their actual columns, not guessed ones.

## 11. Reporting and API

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

**For Revoo, before step 3:**

- Product name and domain for this branch.
- Does Kazimieras get his own login, or does Rapolas operate a shared owner account?
- Do we want a `technician` role for outside repair contractors, or do faults stay assigned to internal staff only?
