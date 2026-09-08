# Step 3 — Core data model

Migration only for review. Nothing is executed until this plan is approved.

Confirmed before writing: every operational table is empty (`properties`, `property_events`, `property_documents`, `bookings`, `expenses`, `invoices`, `property_investments`, `property_maintenance`, `room_status` = 0 rows). Only `property_settings` has 1 row (the `global` branding row). So conversions can be structural, and the one settings row is carried across with `INSERT ... SELECT`, never with literal values.

## Scope correction (per review)

**Dropped now:** `payment_transactions` only (no code reads it).

**Untouched until step 6** — the tenant-portal conversion template: `bookings`, `room_status`, `housekeeping_tasks`, `housekeeping_comments` and the whole `staff` / `housekeeping` module.

**Code cleaned now** (non-template readers of `bookings`):
- `dashboard.functions.ts` — delete `getDashboardStats` entirely (dead since step 1).
- `properties.functions.ts` — booking-date logic removed together with the `properties`→`units` conversion.
- `invoices.server.ts` / `invoices.functions.ts` — drop the `bookings` read/join; invoices stay, no longer tied to a booking.
- `notifications.server.ts` — remove booking-confirmation notification logic.
- `api/public/v1/properties.ts` and `properties.$id.ts` — repointed to `units` with monthly rent; nightly fields gone.
- The staff module keeps working: its `properties(name)` joins become `units(name)`.

## Table conversions

`properties` → **`units`** (rename in place, so existing foreign keys survive).
Drop: `price_per_night`, `price_tiers`, `max_guests`, `beds`, `category`, `year`, `ical_import_url`, `ical_last_sync_at`, `ical_last_status`, `extra_services`, `door_code`, `property_type`, **`rooms`** (it is a `jsonb` short-term room/bed configuration, not a count — the new `room_count int` replaces its only long-term use; keeping both would leave two competing sources).
Keep: `name`, `description`, `address`, `city`, `country`, `lat`, `lng`, `area_m2`, `amenities`, `cover_image_url`, `image_urls`, `features`, `is_active`, `sort_order`, `location_note`, timestamps.
Add: `building_id uuid null → buildings`, `unit_number text not null default ''`, `floor int null`, `room_count int not null default 1`, `monthly_rent numeric(10,2) not null default 0`, `deposit numeric(10,2) not null default 0`, `status text not null default 'vacant' CHECK (status IN ('vacant','occupied','reserved','renovation','inactive'))`, `is_listed boolean not null default false`, `notes text not null default ''`.

`property_events` → **`unit_events`** (`property_id`→`unit_id`; `reason` becomes `kind text not null CHECK (kind IN ('occupied','vacated','renovation','inspection','other'))`; `mileage_km` dropped).

`property_documents` → **`documents`** (`property_id`→`unit_id` nullable; add `lease_id`, `tenant_id`, `bucket text not null default 'documents'`; keeps `kind`, `title`, `file_path`, `mime_type`, `size_bytes`, `expires_at`, `uploaded_by`).
- `kind text not null CHECK (kind IN ('lease_contract','act','id_document','invoice','insurance','inspection','house_rules','other'))`.
- `CHECK (unit_id IS NOT NULL OR lease_id IS NOT NULL OR tenant_id IS NOT NULL)` — a document must always be attached to something.

`property_settings` → **`org_settings`**. Drop every short-term column (check-in/out times, quiet hours, min/max nights, max advance days, guests, children-free age, city tax, extra guest fee, pets/parties, auto-confirm, review request, deposit-per-stay, cancellation fields, `property_id`, `scope`). Keep and extend: display name, logos, brand colours, company/VAT/bank details, invoice series and next number, currency, timezone, default language, contact phone/email, notification toggles, `integrations`. Add: `reading_window_from_day int default 25`, `reading_window_to_day int default 5`, `require_meter_photo boolean default true`, `payment_due_day int default 10`, `default_notice_days int default 30`. Single-row enforced by a `singleton boolean primary-key`-style unique constraint. `claim_invoice_number()` repointed to it.

`property_investments` / `property_maintenance` / `expenses` keep their shape, `property_id`→`unit_id`.

## `documents` vs `signed_contracts` — decision

They are **not** duplicates and a signed lease does **not** live in both as two competing records.

- `signed_contracts` stays the system of record for a contract that this app generated and someone signed through it: it holds the rendered contract text, the signer, the signature and the signing timestamp, and it links to the `contract_templates` row it came from. Step 3 leaves it untouched — its foreign key still points at `bookings`, which also stays until step 6. Step 9 repoints it to `leases`.
- `documents` is the file registry: anything uploaded or attached — scanned paper contracts signed off-app, hand-over acts, ID document scans, insurance, inspection reports, house rules. Every row is one file in a private bucket.
- The overlap is deliberate and one-directional: when step 9 renders a signed contract to PDF, the **file** is stored in the `documents` bucket and gets one `documents` row with `kind = 'lease_contract'` and `signed_contract_id` set (that column is added in step 9, not now). The contract's content and signature stay only in `signed_contracts`; the PDF is only a file. Nothing is ever stored twice as authoritative data.


## New tables

All get `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` + touch trigger (except pure-append tables).

Every status/type/kind text column below is written with an explicit `CHECK (col IN (...))` in the migration — never a comment listing the allowed values. The 5.7 view and the RLS policies match those strings exactly, so a typo must be impossible at database level.

- **buildings** — `name`, `address`, `city`, `postal_code`, `country default 'LT'`, `kind text not null default 'apartment_building' CHECK (kind IN ('apartment_building','dormitory','house','other'))`, `lat`, `lng`, `notes`, `is_active`.
- **tenants** — `first_name`, `last_name`, `phone`, `email`, `notes`, `user_id uuid null` (unique, links a portal login; never assumed set), `is_active`.
- **tenant_identity** — `tenant_id` (unique), `personal_code text`, `id_doc_type`, `id_doc_number`, `issued_by`, `valid_until`. Separate table so a manager cannot read it at all.
- **leases** — `unit_id`, `tenant_id` (primary tenant), `start_date`, `end_date null`, `monthly_rent`, `deposit`, `deposit_paid numeric default 0`, `payment_day int default 10`, `notice_days int default 30`, `status text not null default 'draft' CHECK (status IN ('draft','active','ending','expired','terminated'))`, `renewal boolean default true`, `terminated_at`, `termination_reason`, `notes`. Exclusion constraint: no two non-terminated leases on the same unit with overlapping dates (one unit = one rentable room, so one active lease each).
- **lease_occupants** — `lease_id`, `full_name`, `phone`, `email`, `relation`, `tenant_id null`.
- **meters** — `unit_id null`, `building_id null` (exactly one set, checked), `type text not null CHECK (type IN ('electricity_day','electricity_night','cold_water','hot_water','gas','heating'))`, `serial_number`, `uom`, `initial_reading numeric default 0`, `digits int`, `is_active`, `notes`.
- **meter_readings** — `meter_id`, `period date` (first day of month), `value numeric(12,3)`, `consumption numeric(12,3)`, `photo_path`, `submitted_by uuid null`, `submitted_at`, `status text not null default 'submitted' CHECK (status IN ('submitted','approved','rejected'))`, `needs_review boolean default false`, `reviewed_by`, `reviewed_at`, `note`, `superseded_by uuid null`. Unique partial index on `(meter_id, period)` where `status <> 'rejected'` — one accepted reading per meter-period. Validation trigger (not a CHECK, because it reads other rows): value must be ≥ the last approved reading for that meter; a jump above a configurable multiple is accepted but flagged `needs_review`. No hard deletes — corrections insert a new row and set `superseded_by`.
- **utility_rates** — `type` (same CHECK list as `meters.type`), `effective_from date`, `price_per_unit numeric(10,4)`, `fixed_monthly numeric(10,2) default 0`, `note`. Never updated in place; a new rate is a new row. Unique `(type, effective_from)`.
- **charges** — `lease_id`, `period date`, `kind text not null CHECK (kind IN ('rent','utility','fixed','one_off','penalty'))`, `meter_reading_id null`, `utility_rate_id null`, `description`, `quantity`, `unit_price`, `amount numeric(10,2)`, `invoice_id null`.
- **payments** — `lease_id`, `paid_at date`, `amount numeric(10,2)`, `method text not null default 'bank' CHECK (method IN ('bank','cash','other'))`, `reference`, `note`, `recorded_by`.
- **issues** — `unit_id`, `lease_id null`, `reported_by uuid null`, `reporter_name`, `category`, `title`, `description`, `photo_paths jsonb default '[]'`, `priority text not null default 'normal' CHECK (priority IN ('low','normal','high','urgent'))`, `status text not null default 'new' CHECK (status IN ('new','acknowledged','in_progress','waiting','resolved','rejected'))`, `assigned_to`, `cost numeric null`, `resolved_at`.
- **issue_comments** — `issue_id`, `author_id null`, `author_role`, `body`, `photo_paths`, `is_internal boolean default false` (internal notes hidden from the tenant).
- **rental_inquiries** — `unit_id null`, `name`, `phone`, `email`, `move_in_date null`, `message`, `status text not null default 'new' CHECK (status IN ('new','contacted','viewing_scheduled','converted','dismissed'))`, `handled_by`, `converted_lease_id null`, `source text default 'public_site'`.

Also carrying a CHECK, listed with their tables above: `units.status`, `unit_events.kind`, `documents.kind`.


## RLS sketch

Roles resolve through the step-2 helpers (`is_manager` already includes owner and developer; `is_owner` includes developer).

Two tenant-scoping helpers, both `security definer`:
- `current_tenant_id()` — the `tenants.id` whose `user_id = auth.uid()`.
- `tenant_owns_lease(lease_id)` / `tenant_owns_unit(unit_id)` — true when a lease of `current_tenant_id()` with status `active|ending` covers that lease/unit.

| Table | developer / owner | manager | tenant | anon |
|---|---|---|---|---|
| buildings, units | all | read + write, no delete | read own unit only | none (public site reads the view, not the table) |
| tenants | all | read + write, no delete | read own row | — |
| tenant_identity | all | **none** | none | — |
| leases, lease_occupants | all | read + write, no delete | read own lease | — |
| meters | all | read + write, no delete | read meters of own unit | — |
| meter_readings | all | read + write + approve, no delete | read own; insert own with `status='submitted'` and `submitted_by = auth.uid()`; no update after insert | — |
| utility_rates | all | read only | none | — |
| charges | all | read + write, no delete | read own lease | — |
| payments | all | read + write, no delete | read own lease | — |
| issues | all | read + write, no delete | read own unit; insert for own unit; update only own `new` issue | — |
| issue_comments | all | read + write | read non-internal on own issue; insert | — |
| documents | all | read + write, no delete | read documents attached to own lease/unit/self | — |
| unit_events | all | read + write, no delete | none | — |
| rental_inquiries | all | read + update, no delete | none | **insert only** (no read) |
| org_settings | owner writes | read only | none | — |
| utility/invoice tables kept from before | unchanged from step 2 | | | |

Every new public table gets its GRANT block in the same migration (`authenticated` + `service_role`; `anon` only where a policy allows it — `rental_inquiries` insert and the vacancy view).

## Availability (AGENTS.md 5.7) — exact logic

A **view**, not a column, not a cron. `public.public_vacancies`, `security_invoker = off` so it can be read by `anon` without opening the `units` table itself, exposing only public-safe columns.

```sql
create view public.public_vacancies as
select u.id, u.name, u.unit_number, u.description, u.city, u.address,
       b.name as building_name, u.area_m2, u.room_count, u.floor,
       u.monthly_rent, u.deposit, u.amenities, u.cover_image_url, u.image_urls,
       case when u.status = 'vacant' then current_date
            else l.end_date + 1 end as available_from,
       (u.status = 'vacant')                    as vacant_now
from public.units u
left join public.buildings b on b.id = u.building_id
left join lateral (
  select l.end_date from public.leases l
  where l.unit_id = u.id
    and l.status in ('active','ending')
    and l.start_date <= current_date
    and (l.end_date is null or l.end_date >= current_date)
    and l.renewal = false
    and l.end_date is not null
  order by l.end_date limit 1
) l on true
where u.is_active and u.is_listed
  and ( u.status = 'vacant' or (u.status = 'occupied' and l.end_date is not null) )
  -- hide anything already re-let: a future lease covering the free-from date
  and not exists (
    select 1 from public.leases f
    where f.unit_id = u.id
      and f.status in ('draft','active','ending')
      and f.start_date > current_date
  );
```

Read at request time, ordered by `available_from`, so a date can never go stale. `is_listed` gates visibility and can only hide, never invent, availability: an occupied unit with no notice given has no `end_date` row and therefore cannot appear. `reserved`, `renovation` and `inactive` never appear. `GRANT SELECT ON public.public_vacancies TO anon, authenticated;`

## Storage buckets (AGENTS.md 5.3)

Four buckets, created with the storage tool, policies written on `storage.objects` in the migration:

| Bucket | Public | Limit | Contents | Access |
|---|---|---|---|---|
| `unit-photos` | yes | 10 MB | marketing photos of units | anyone reads; manager writes |
| `documents` | **no** | 20 MB | leases, signed contracts, tenant ID documents | manager reads/writes; a tenant reads only paths under `lease/<own lease id>/` or `tenant/<own tenant id>/`; served through signed URLs only |
| `meter-photos` | **no** | 10 MB | meter evidence photos | tenant writes into `<own unit id>/`, reads own; manager reads all |
| `issue-photos` | **no** | 10 MB | fault and damage photos | same pattern as meter photos |

Path convention `<scope>/<id>/<uuid>.<ext>` so the RLS policy can check ownership from `storage.foldername(name)`. Meter and fault photos keep a higher size ceiling than marketing images — a meter dial must stay readable. Deleting a tenant deletes their storage objects (a `before delete` trigger enqueues the paths; the delete pass runs in the same server function that deletes the tenant). The legacy public `car-images` bucket is emptied and dropped.

## Technical notes

- One migration, ordered: drop `payment_transactions` → rename/convert `properties`, `property_events`, `property_documents`, `property_settings` → create new tables → GRANTs → RLS enable → policies → triggers → view → storage policies.
- `org_settings` is populated with `insert ... select` from the old settings row; no literal client values appear in SQL.
- After the migration, `src/integrations/supabase/types.ts` regenerates and the code pass listed under "Scope correction" runs; `bunx tsgo --noEmit` must be clean before step 3 is called done.
- Verification: every new policy is checked with a live `supabase--read_query` against `pg_policies`, plus a `tenant_identity` read attempt as a manager-scoped role, and a `public_vacancies` read as `anon`.
