# AGENTS.md — Revoo Rent (long-term rental management)

Rules for any AI agent (Lovable, Claude, or otherwise) working in this repository. Read this before making changes. Read PLAN.md for the build order.

---

## 1. Who this is for

**Revoo** is a three-person product company (Marius, Kęstutis, Mantas). Revoo builds and operates rental software. Revoo is the **developer** of this system — the highest role, full access, never removable by a client.

Revoo's first product line was short-term rental (vacation rentals and hotels; the `demo-rentals` / Dharma Stay project). **This project is the opposite branch: long-term residential rental management.** Nothing here is nightly, nothing here has guests, check-in times, or availability calendars.

**Kazimieras and Rapolas** are the first clients of this branch. They co-own a portfolio of roughly **100 long-term rental units, concentrated in Klaipėda**: small apartments and individual rooms in shared/dormitory-style buildings. Budget segment, low rent per unit, high unit count. Both are **owners** in the system. Rapolas is the one who actually opens the admin every morning and runs day-to-day operations.

This single-city concentration is a fact about this deployment, not a rule for the product — Revoo will sell this same system to landlords in other cities, so nothing about Klaipėda specifically belongs in code or migrations (see the white-label rule in section 3). It matters for realistic example data, and later for anything city-specific like utility providers or map defaults for this deployment's own settings.

**Today they run all of this in Excel.** Spreadsheets for units, tenants, contract dates, meter readings, and payments; phone calls, SMS and messaging apps for everything else. Contracts get sent as files, expire without warning, and get renewed late. Meter readings arrive by text message or not at all. Fault reports arrive by phone call with no record. Nothing is searchable and nothing is auditable.

The product replaces that.

## 2. What we are building

A web application (mobile-friendly; a native app may follow later, so keep the API layer clean) with **two completely separate experiences behind one login**:

**A. The management side (`/admin`)** — for Kazimieras, Rapolas, and any future staff.
Rapolas arrives at work, opens the dashboard, and immediately sees what needs attention today: contracts about to expire, units standing empty, who has not submitted meter readings this month, open faults, and who owes money. From there he manages units, tenants, leases, readings, invoices, documents and faults.

**B. The tenant portal (`/nuomininkas`)** — for tenants, on a phone.
A tenant logs in and sees only their own unit. They submit meter readings (electricity, water, gas) with a photo of the meter, report faults and damage with photos, see their lease and its end date, see what they owe, and read messages from the manager. They see nothing about any other unit, tenant, or the portfolio.

**C. The public vacancy site** — no login, open to anyone.
A public visitor sees which units are vacant now or becoming vacant soon, with a real move-in date, and can send a rental inquiry directly from a listing. This list is not manually maintained — it is derived automatically from the same `units` and `leases` data Rapolas manages in the admin. When a lease is marked as not renewing, or a unit's status changes to vacant, that unit appears on the public site with its true available-from date, with no separate step for anyone to remember. A submitted inquiry notifies the owners the same way an internal event would, and appears in the admin as something to act on — convert it into a viewing, then into a new lease, or dismiss it.

This third surface reuses the listing-grid and inquiry-dialog pattern already proven in `demo-rentals`'s public apartment pages, converted from nightly availability to lease-based availability. See PLAN.md step 1 and step 5.

## 3. This is a product, not a one-off site

Revoo will sell this system to other landlords with similar portfolios once it works for Kazimieras and Rapolas. That has one non-negotiable consequence:

**Nothing client-specific may ever be hardcoded.** No "Kazimieras", no portfolio name, no logo file, no brand colour, no company details, no addresses, no unit names, no service names, no prices, no tariffs, no email signatures — not in components, not in constants, not in migrations, not in seed files. Every one of those is a database value the owner edits in Settings, with a sensible neutral default in code.

If you find yourself typing a real name, a real address, or a real number into a `.ts` or `.sql` file, stop. It belongs in `org_settings`.

**Deployment model:** one deployment per client (clone-per-client), the same model used across all Revoo/Deerva projects. Do **not** add an `org_id` column to every table or build multi-tenant row isolation. Isolation is achieved by separate deployments. The white-label requirement above is what makes a clone take minutes instead of days.

---

## 4. Where this code came from

This repository is a remix of **`demo-rentals`** — the Dharma Stay short-term rental platform. It was chosen because roughly two thirds of what this product needs already exists there and works: the role and invitation system, the object registry with a photo pipeline, the document and expense modules, the contract-template and PDF engine, the invoice engine with numbering series, the KPI dashboard shell, the templated-messaging system, the scheduled-notifications runner, the API-key layer, and — most importantly — a proven pattern for a **second, restricted, mobile-first portal** for non-admin users.

Everything that is short-term-specific is leftover and wrong here. See PLAN.md step 1 for the exact carve-out list. In short, the following concepts do not exist in this product and must not appear anywhere in code, UI, database, or copy:

nightly prices, price tiers per night, guests / adults / children / infants, max_guests, check-in and check-out times, quiet hours, city tax, availability search, iCal import/export, door codes for short stays, cars and fleet, restobaras / sauna / banketinė salė / dovanų kuponai, the Rentivo "Core ↔ Booking Engine" split, housekeeping as a daily room-cleaning cycle.

Where an old module is being converted rather than deleted, PLAN.md says so explicitly. Do not delete anything PLAN.md marks as a conversion template before the conversion step runs.

Correction after inspecting the actual import graph: the public apartment listing pages, `PropertyCard`/`PropertyGrid`, `BookingDialog`, and their supporting `property-slug.ts` / `property-category.ts` / `property-view.ts` / `property-queries.ts` are not self-contained presentation code — every one of them fetches data through `rentivo.functions.ts` → `rentivo-api.server.ts`, is typed by `rentivo-schemas.ts`, and reads copy from `@/content`. There is no seam where the Rentivo Core-client layer can be deleted while this module keeps working untouched. It is deleted in step 1 along with the rest of the Rentivo layer, exactly like every other public route. `PropertyGallery.tsx` is the one exception worth checking individually — if it turns out to be a pure image-carousel with no Rentivo/content import, it can survive as a generic gallery component; if it imports any of the above, it goes too.

The public vacancy site in step 5 is a **fresh build**, not a conversion. It reuses the layout shell (`SiteHeader`, `SiteFooter`, `PageHero`, `ContactForm`, `ContactCta`, `LanguageSwitcher`, `LocaleLink`, `Prose`, `Reveal` — none of which touch Rentivo or content) and takes its visual direction from the board-metaphor HTML mockup, but its data layer is written from scratch against `units` and `leases` once those exist after step 3. No file from the old listing module is edited in place; step 5 writes new routes, new pages, new components.

---

## 5. Hard rules

### 5.1 A tenant record is not a user account

Most tenants in this segment will never log in. The system must be fully usable by Rapolas with **zero** tenants having accounts.

- `tenants` is a plain data table (name, contact details, notes). It exists whether or not that person ever logs in.
- A tenant gets a portal login only when someone invites them. That creates an `auth.users` row and links it via `tenants.user_id`.
- Never require a login to create a tenant, a lease, a reading, or an invoice.
- Never assume `tenants.user_id` is set.

### 5.2 Roles

Four roles, one enum, strict hierarchy:

| Role | Who | Access |
|---|---|---|
| `developer` | Revoo | Everything. Can delete anyone, including owners. Untouchable by anyone else. |
| `owner` | Kazimieras, Rapolas | Everything except modifying or deleting a developer. Manages users and settings. |
| `manager` | Future staff | Day-to-day operations: units, tenants, leases, readings, faults, invoices. **No** user management, **no** settings, **no** deletions. |
| `tenant` | Tenants | Own unit and own lease only. Nothing else, ever. |

Build all four in the enum now. Build the `manager` UI only when a real staff member needs it — but write the RLS policies for it correctly from the start, because retrofitting RLS is where these projects break.

`tenant` RLS is the highest-risk surface in this codebase. Every table a tenant can read must be filtered by a lease that is currently linked to their `tenants.user_id`. Never rely on a client-side filter. Never return another unit's data from an API route and hide it in the UI.

### 5.3 Personal data and GDPR

This system holds a lot of real personal data about real people: names, phone numbers, addresses, lease terms, payment history, debt, and in Lithuania very likely **asmens kodas** on signed leases.

- Store a personal identification number only if the lease genuinely requires it. If stored, it lives in a column readable by `developer` and `owner` only — never by `manager`, never by any tenant, never in an API response, never in a log line, never in an error message.
- **Signed contracts, personal documents and meter photos go in a private storage bucket accessed through signed URLs.** The inherited codebase uploads everything to one public bucket (`car-images`) — that is fine for marketing photos and completely unacceptable here. Create separate buckets and get this right in the migration that introduces documents, not later.
- Deleting a tenant must delete their storage objects. Orphaned files have been a recurring bug in sibling projects.

### 5.4 No client data in migrations

Migrations define structure only. Units, tenants, tariffs, prices, org details and photos are entered through the admin panel or imported. Nothing about Kazimieras, Rapolas, or their portfolio is ever written into a `.sql` file.

### 5.5 Meter readings are financial records

A reading turns into money on an invoice, so it needs the discipline of a financial record:

- A reading belongs to a `(meter, period)` pair and there is exactly one accepted reading per pair.
- A new reading must be greater than or equal to the previous accepted reading for that meter. Reject lower values with a clear message; a meter rollover is handled by an admin, not by silently accepting the number.
- Flag implausible jumps for review rather than accepting them silently.
- A reading submitted by a tenant starts as `submitted` and becomes `approved` only when a manager accepts it. Consumption and charges are calculated from approved readings.
- Readings are never hard-deleted. Corrections are new rows with an audit trail of who changed what.
- A photo of the meter is the evidence layer. Encourage it on submit; make it required by an org setting.

### 5.6 Images and uploads

Every upload goes through the existing client-side optimisation pipeline (resize, WebP, EXIF strip). No direct-to-storage paths. Replacing an image deletes the file it replaced. Meter photos and fault photos are evidence — do not over-compress them to the point where a meter dial is unreadable; use a higher size ceiling for those than for marketing images.

### 5.7 Public availability is computed, never entered twice

The public site must never have its own "is this unit available" field that someone fills in by hand. `available_from` for a listed unit is derived, in this order: a unit with status `vacant` is available today; a unit with status `occupied` whose active lease has `renewal = false` and an `end_date` is available from that end date; anything else is not shown. Recompute this at read time (a view or a server function), not by writing it into a column on a schedule — a stale cached date on a rental listing is worse than no listing.

A unit only appears on the public site if `is_listed` is true. `is_listed` and availability are independent: an owner can hide an available unit, but can never make an occupied-with-no-notice unit appear available.

### 5.8 Language

Lithuanian is the working and default language. The inherited i18n layer (`lt` / `en`) already works and stays — Revoo will need English for the next client. Every user-facing string goes through i18n. No hardcoded Lithuanian in components.

### 5.9 The app must be usable on a phone

Rapolas walks around buildings. Tenants have cheap Android phones. The tenant portal is phone-first, not phone-tolerant: large tap targets, a numeric keypad for readings, camera capture for photos, and it must work on a slow connection. The admin is desktop-first but every screen must survive a phone.

---

## 6. Data model

New tables, on top of what is kept from the base project.

| Table | Purpose |
|---|---|
| `buildings` | Optional parent for units. Address, city, type (apartment building / dormitory / house), notes. A standalone flat can have no building. |
| `units` | The rentable object. Converted from the inherited `properties` table. Building, unit number, floor, area, rooms, monthly rent, deposit, status (`vacant` / `occupied` / `reserved` / `renovation` / `inactive`), photos, notes, `is_listed` (owner opts a unit into the public site). |
| `tenants` | A person. Name, phone, email, notes, optional `user_id` link to a portal account. See 5.1. |
| `leases` | The contract. Unit, primary tenant, start date, end date, monthly rent, deposit, payment day of month, notice period, status (`draft` / `active` / `ending` / `expired` / `terminated`), renewal flag. **Replaces the inherited `bookings` table entirely — do not adapt `bookings`, create `leases` clean and drop `bookings`.** |
| `lease_occupants` | Additional people on one lease, for shared rooms. |
| `meters` | Belongs to a unit or to a building (shared/common meters). Type (`electricity_day`, `electricity_night`, `cold_water`, `hot_water`, `gas`, `heating`), serial number, unit of measure, initial reading, active flag. One unit can have several. |
| `meter_readings` | Meter, period (`YYYY-MM`), value, consumption, photo, submitted_by, submitted_at, status (`submitted` / `approved` / `rejected`), note. See 5.5. |
| `utility_rates` | Tariffs by type with `effective_from`, price per unit, optional fixed monthly fee. History matters — never overwrite a rate, add a new row. |
| `charges` | Monthly line items per lease: rent, each utility, fixed fees, one-offs. Generated from approved readings plus the rate effective for that period. |
| `payments` | Money received against a lease. Drives balance and debt. |
| `issues` | Faults and damage. Unit, lease, reported_by, category, title, description, photos, priority, status (`new` / `acknowledged` / `in_progress` / `waiting` / `resolved` / `rejected`), assignee, cost, resolved_at. |
| `issue_comments` | Thread between tenant and manager on one issue. |
| `unit_events` | Timeline per unit: occupied from/to, vacancy, renovation, inspection. Converted from `property_events`. |
| `documents` | Files attached to a unit, lease or tenant, with `expires_at` so the dashboard can warn. Converted from `property_documents`. Private bucket. |
| `rental_inquiries` | Public-site lead. Unit, name, phone, email, desired move-in date, message, status (`new` / `contacted` / `viewing_scheduled` / `converted` / `dismissed`), created_at. Same shape and RLS pattern as the `leads` table proven in Halliday Architects: public insert, admin-only read. Converting one into a lease is a manual action by a manager or owner, never automatic. |
| `org_settings` | The single white-label row: display name, logo, colours, company and VAT details, bank details, invoice series and next number, currency, timezone, default language, notification toggles, reading-window dates. Converted from the inherited `property_settings` (drop every short-term field). |
| `user_roles` | `developer` / `owner` / `manager` / `tenant`. |

Kept and reused as-is: `invoices`, `contract_templates`, `signed_contracts`, `expenses`, `content_templates`, `content_translations`, `api_clients`, `api_request_log`, `app_secrets`, `page_views`.

Dropped: `bookings`, `booking_notifications`, `cars`, `car_investments`, `car_maintenance`, `room_status`, `housekeeping_tasks`, `housekeeping_comments`, `property_settings` (after conversion), `payment_transactions` (no online card payments in v1).

---

## 7. The three surfaces

### Admin dashboard — what Rapolas sees first

This is the screen the whole product is judged on. It answers "what do I have to do today" without clicking anything:

- Leases expiring in 30 / 60 / 90 days, soonest first
- Vacant units and how many days each has been empty
- Meter readings missing for the current period: X of Y units
- Open faults, oldest and highest priority first
- Debtors: who is behind, by how much, total outstanding
- Documents expiring soon
- Occupancy rate and monthly rent roll

Every card is a link into a filtered list. Nothing on this screen is decorative.

### Tenant portal — what a tenant sees

One unit, nothing else:

- My unit and my lease: rent, payment day, end date
- Submit this month's readings — one field per meter, numeric keypad, photo of the meter, previous value shown for reference
- Report a fault: category, description, photos, then a status thread
- My balance and my invoices
- My documents: lease, house rules
- Contact the manager

The old `/staff` housekeeping portal in this codebase is the structural template for this: separate layout, its own role gate, its own API namespace, mobile card UI. Convert it, do not reinvent it, and do not delete it before the conversion step.

### Public vacancy site — what a visitor sees

No login. A list of vacant and soon-to-be-vacant units, soonest first, each showing location, room type, rent, and a real available-from date — never a vague "contact us." Clicking a unit opens an inquiry form: name, phone, email, desired move-in date, a short message. Submitting creates a `rental_inquiries` row, sends the owners a notification the same way the internal notification system already does, and shows the visitor a plain confirmation, not a fake "we'll get back to you in 24 hours" unless that is a real commitment the owners intend to keep.

This is a fresh build, not a conversion — see the correction in AGENTS.md section 4. The old `demo-rentals` listing grid and inquiry dialog are gone by the time step 5 starts; they exist only as a git-history and visual reference. What changes conceptually: a date range with nightly pricing becomes a single move-in date with monthly rent.

---

## 8. Working method

- **Plan mode first for anything structural.** Marius reviews every plan against the actual repository before it is approved. Do not start writing code in the same message as the plan.
- **One concern per prompt.** End every task scope with "nothing else in this task".
- **A completion summary is not evidence.** Every change is verified against the repository and, for database work, against a live SQL query. The migration file shows intent; the live query is the truth.
- **A feature is done when Rapolas could use it without being taught.** If adding a unit, approving a reading, or renewing a lease needs explaining, the screen is not finished.
- Document architectural decisions in this file and in PLAN.md so a future remix inherits them.
