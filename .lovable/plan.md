# Step 4 — Admin: units, tenants, leases

Scope: three admin areas (Butai, Nuomininkai, Sutartys) built on the step-3 schema. No public site, no tenant portal, no dashboard cards, no billing generation. Nothing else in this task.

## 1. Units list (`/admin/units`)

Built for ~100 rows: one server query, client-side filtering, no pagination initially (virtualise only if it gets slow).

- Search over name, unit number, address, building name.
- Filters: building (dropdown from `buildings`), status (the five CHECK values only), listed / not listed.
- Columns: unit (name + unit number + floor), building, rooms / m2, monthly rent, status badge, vacancy indicator, listed marker.
- Vacancy indicator ("tuščias X d."): shown only for units with status `vacant`. Days = today minus the most recent `end_date` of that unit's non-active leases (`expired` / `terminated`); if the unit never had a lease, days = today minus `units.created_at`. Computed server-side in the list query so the list and any later dashboard card use one rule.
- Row actions: open detail, toggle `is_listed`.
- "Naujas butas" dialog + edit form: name, building (optional), unit number, floor, room count, area, monthly rent, deposit, address/city/country, description, notes, amenities, photos (existing upload pipeline, `unit-photos` bucket), `is_listed`, `is_active`, sort order.
- **Status is a Select with exactly `vacant` / `occupied` / `reserved` / `renovation` / `inactive`** — never free text — matching the DB CHECK. The option list is a single exported const shared by the form, the filter and the badges, so the UI can never drift from the constraint.

## 2. Unit detail (`/admin/units/$id`)

Header: name, building + unit number, status badge, `is_listed` switch, edit button. Tabs:

- **Apžvalga** — key facts, photos, notes, rent/deposit, availability line ("laisvas nuo …" from the same rule the public view uses).
- **Nuoma ir nuomininkas** — active lease card (tenant, term, rent, payment day, notice), occupants, plus lease history; actions: create / renew / terminate (section 4).
- **Skaitliukai ir rodmenys** — meters for this unit (and the building's shared meters, read-only), add meter, per-meter reading history with status, approve / reject a submitted reading, add a reading manually. Reading writes go through the DB trigger — the UI never computes consumption.
- **Gedimai** — issues for this unit with status/priority, open the thread, change status, assign, record cost.
- **Dokumentai** — upload/list/delete against the private `documents` bucket via signed URLs, with `expires_at`.
- **Sąnaudos** — expenses, investments and maintenance rows already keyed by `unit_id`.
- **Timeline** — `unit_events`, plus derived entries from leases (occupied / vacated) so the history is complete without duplicating data.

## 3. Tenants (`/admin/tenants`, `/admin/tenants/$id`)

- List: search by name / phone / email, active filter, current unit column (from active lease), badge for "turi prisijungimą" (`user_id` set).
- Create / edit: first name, last name, phone, email, notes, active flag. Never requires an account — see AGENTS.md 5.1.
- Detail: contact block, current and past leases, occupancy on other leases, documents, issues reported, payments/balance summary (read-only until step 8).
- Identity block (personal code, ID document) rendered only for owner/developer; hidden entirely for managers, matching the `tenant_identity` policy. The server function returns nothing for a manager rather than filtering in the UI.
- Portal invite button is left as a stub link to step 6 — not built here.

## 4. Leases

Actions available from the unit detail and from the tenant detail.

- **Create**: unit, primary tenant, start date, end date (optional = open-ended), monthly rent (prefilled from unit), deposit, payment day, notice days, renewal flag, occupants, notes. Saves as `draft` or `active`. Overlap is enforced by the DB exclusion constraint; the form catches that error and shows a plain "šiuo laikotarpiu butas jau išnuomotas".
- **Renew**: creates a **new** lease row starting the day after the current one ends, copying terms with editable rent/term; the old lease moves to `expired`. History is preserved as separate rows rather than mutating dates — a renewal is a new contract.
- **Terminate**: sets `status = 'terminated'`, `terminated_at`, `termination_reason`, and an effective end date; unit status is set to `vacant` when the effective date is today or earlier, otherwise the unit stays `occupied` and flips on that date.
- **`renewal` + `end_date` semantics** (the field pair that drives both the future dashboard warnings and `public_vacancies`):
  - `renewal = true` — tenant is staying; the unit must not appear as becoming vacant.
  - `renewal = false` with an `end_date` — notice given; the unit becomes publicly available from that date, exactly the condition the step-3 view already encodes.
  - Setting `renewal = false` in the UI shows an inline note that the unit will appear on the public site from the end date if `is_listed` is on — so nobody publishes a unit by accident.
  - Unit `status` and lease state are kept consistent by the write path: activating a lease sets the unit to `occupied`; terminating or expiring the last active lease sets it back to `vacant`.

## Technical notes

- New server-function modules: `src/lib/units.functions.ts`, `src/lib/tenants.functions.ts`, `src/lib/leases.functions.ts`, `src/lib/meters.functions.ts`, `src/lib/issues.functions.ts`, `src/lib/documents.functions.ts` — all `createServerFn` with `requireSupabaseAuth`, each guarded by the existing `has_role(_role: 'manager')` check, deletes guarded by `is_owner`. RLS remains the real boundary; the guards only give clean errors.
- Shared enums in `src/lib/unit-status.ts` (status, lease status, issue status/priority, meter type, document kind) mirroring the DB CHECK lists one-to-one.
- Routes: `admin.units.tsx` (list), `admin.units.$id.tsx` (detail with tabs), `admin.tenants.tsx`, `admin.tenants.$id.tsx`. Sidebar gains "Butai" and "Nuomininkai" above Sutartys.
- Data loading: TanStack Query with `useServerFn`, per-tab query keys so switching tabs doesn't refetch the whole unit.
- All strings through i18n (`lt` + `en`); the leftover `properties.*` and `nav.properties` keys are reworked into `units.*` / `nav.units`.
- Vacancy-days and availability logic lives in one server helper, so it cannot disagree with `public_vacancies`.
- Verification before reporting done: `bunx tsgo --noEmit`, production build, and live SQL checks — status CHECK rejects an unknown value, overlapping lease create is rejected, terminate flips unit status, and a unit with `renewal = false` + future `end_date` appears in `public_vacancies` with the right date while a `renewal = true` unit does not.
