# Step 6 — Tenant portal (`/nuomininkas`)

Scope: convert the inherited `/staff` housekeeping portal into a phone-first tenant portal, add a tenant-only server-function namespace scoped through the tenant's own active lease, and add "invite this tenant" to the tenant detail page. Nothing else in this task.

## 1. What already exists (verified)

- RLS for the `tenant` role is already in place on `units`, `buildings`, `leases`, `lease_occupants`, `meters`, `meter_readings`, `issues`, `issue_comments`, `documents`, `charges`, `payments` — all scoped through `current_tenant_id()`; tenants can insert readings, issues and issue comments.
- `current_tenant_id()` and `is_tenant()` exist as security-definer helpers.
- `/staff` (`staff.tsx` layout + `staff.index.tsx` + `staff.$id.tsx`) is the mobile card-UI template and is gated on `isManager`.
- Private buckets `meter-photos`, `issue-photos`, `documents` exist; the meter trigger computes `consumption` and enforces the `initial_reading` baseline.
- `invoices` has no tenant policy — invoices stay out of this step (see section 6).

No migration is expected in this step. If a check shows a tenant policy gap (for example reading `org_settings` contacts, or a storage policy for a tenant's own upload path), that single gap is fixed in one small migration and reported.

## 2. Routes

New route group, replacing `/staff`:

| Route | Screen |
|---|---|
| `/nuomininkas` | Layout: role gate on `tenant`, sticky header with unit name, language switcher, sign out |
| `/nuomininkas/` | Home: my unit and lease (rent, payment day, end date, notice), balance, quick actions |
| `/nuomininkas/rodmenys` | Submit this month's readings, one card per meter |
| `/nuomininkas/gedimai` | My faults, list + report form |
| `/nuomininkas/gedimai/$id` | One fault: status, photos, comment thread |
| `/nuomininkas/dokumentai` | My documents (signed URLs) |

`/staff*` routes, `staff-api-*`, `src/routes/api/staff/v1/*`, `housekeeping.functions.ts`, `housekeeping.server.ts` and `admin.housekeeping.tsx` are deleted once the portal replaces them — they were explicitly marked as templates.

Sign-in routing: after login, a user whose only role is `tenant` lands on `/nuomininkas`; managers/owners keep landing on `/admin`.

## 3. Server functions — `src/lib/tenant-portal.functions.ts`

All use `requireSupabaseAuth`, a new `requireTenant` guard, and the user's own Supabase client so RLS is the real boundary. No `unit_id` or `lease_id` is ever accepted from the client for scoping — the active lease is resolved server-side from `current_tenant_id()`.

- `getMyLease()` — active/ending lease + unit + building, rent, deposit, payment day, notice days, end date, renewal flag.
- `getMyMeters()` — meters for my unit (and shared building meters), each with the last approved reading and whether the current period is already submitted.
- `submitMyReading({ meter_id, value, photo_path })` — inserts `status = 'submitted'`, period = current month, `submitted_by = auth.uid()`. The `meter_id` is re-checked against my unit before insert. Lower-than-previous values surface the trigger's message in plain Lithuanian.
- `listMyIssues()` / `getMyIssue(id)` / `createMyIssue()` / `addMyIssueComment()` — comments marked `is_internal = false`; internal manager notes are excluded by the existing policy.
- `listMyDocuments()` + `signMyDocument(path)` — signed URL, 5 minutes, only for documents the policy already returns.
- `getMyBalance()` — sum of my `charges` minus my `payments`, plus the last few of each. No invoice PDF in this step.

## 4. UI

Phone-first, reusing the `/staff` card patterns:

- Reading input: `inputmode="decimal"`, large field, previous approved value shown as reference, meter type and serial as the label, camera capture (`capture="environment"`) for the meter photo, uploaded through the existing optimisation pipeline at a higher quality ceiling so the dials stay readable.
- Fault report: category select (the same CHECK-constrained values as the admin), title, description, up to 5 photos, then a status thread.
- Tap targets ≥44px, one column, no admin sidebar, works on a slow connection.
- All copy through i18n in a new `tenant.*` namespace, LT + EN.

## 5. Invite a tenant

On `/admin/tenants/$id`, an "Invite to portal" action for manager+:
- Requires an email on the tenant record.
- Uses the existing invite flow, assigns the `tenant` role only, and links `tenants.user_id` on acceptance.
- Shows current state: no account / invited / active. Revoking access clears the role and `user_id`, and never deletes the tenant record.

## 6. Deliberate gaps (recorded in roadmap.md)

- Invoices in the portal wait for step 8 (billing); the balance screen shows charges and payments only.
- No tenant-facing notifications; those come with step 10.

## Technical notes

- `requireTenant` mirrors `requireManager` in `admin-guard.server.ts` using `has_role(uid,'tenant')`.
- A manager/owner opening `/nuomininkas` is redirected to `/admin` rather than shown an error.
- The portal is not linked from the public site; it is reached by direct link after an invite.

## Verification before reporting done (each reported with its actual output)

1. `bunx tsgo --noEmit` — full output.
2. `bun run build` — full tail.
3. SQL: with a temporary tenant user, read `units`, `leases`, `meter_readings`, `issues`, `documents` — printed rows show only that tenant's unit; a second unit's rows are absent.
4. SQL: the same tenant attempts to read another tenant's `issues` and `charges` — printed empty result.
5. Browser as the tenant: submit a reading (with a photo) and report a fault — resulting `meter_readings` row (`status`, `period`, `consumption`) and `issues` row printed.
6. SQL: reading below the previous value is rejected — printed error text.
7. Browser: `/nuomininkas` as a manager redirects to `/admin`; console errors listed.
8. Test users and rows deleted afterwards, confirmed with count queries.
