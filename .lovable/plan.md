# Step 2 — Roles and access

## Goal
Replace the inherited role model with the strict hierarchy `developer → owner → manager → tenant`, update every active policy and application authorization check, and keep a tenant record independent from a tenant login.

`PLAN.md` remains the only authoritative roadmap. Delete `roadmap.md` rather than maintain a second sequence.

## Confirmed current state
- The live enum currently contains seven labels: `admin`, `user`, `housekeeper`, `developer`, `owner`, `administrator`, `tenant`.
- `user_roles` contains one assignment, and it is `developer`; that assignment must survive unchanged.
- The live database has **30 policies across 23 tables** whose expressions reference a legacy role. All 30 currently call `has_role(auth.uid(), 'admin'::app_role)`; no active policy expression currently calls `administrator` or `housekeeper` directly.
- `has_role` treats legacy `admin` as `developer | owner | administrator | admin`; `is_manager` and `is_tenant` do not exist.
- The generic invitation currently accepts `developer`, `owner`, `administrator`, and `tenant`. There is not yet a `tenants` table to which a portal account can safely be linked.

## 1. Rebuild the enum and role helpers
Apply one repository-backed database migration:

1. Temporarily remove/recreate the policies and functions that depend on `app_role`, replace the enum type, and restore `user_roles.role` against a new enum containing only:
   - `developer`
   - `owner`
   - `manager`
   - `tenant`
2. Map any legacy assignments defensively during conversion:
   - `administrator` and `admin` → `manager`
   - `housekeeper` and `user` → no automatic privileged assignment; abort the migration if such rows exist so they can be reviewed rather than silently escalated. The live preflight currently shows only the developer row.
3. Preserve the unique `(user_id, role)` rule, foreign key, trigger, RLS, and the existing developer assignment.
4. Recreate the helpers as `SECURITY DEFINER` functions with `search_path = public`:
   - `has_role(user, developer)` → exact developer
   - `has_role(user, owner)` → developer or owner
   - `has_role(user, manager)` → developer, owner, or manager
   - `has_role(user, tenant)` → exact tenant only
   - `is_developer` → exact developer
   - `is_owner` → developer or owner
   - `is_manager` → developer, owner, or manager
   - `is_tenant` → exact tenant only
5. Revoke default public/anonymous execution on these identity helpers; grant execution only where authenticated application access requires it. Recreate role policies as `TO authenticated` so public reads are not forced through staff checks.
6. Ensure `authenticated` can read its own role rows and `service_role` retains full access. Role mutation remains server-controlled; no broad client-side role grants.
7. Update the role-guard trigger so only a developer can create, change, or remove a developer assignment, while owners can manage allowed lower roles through the verified server flow.

## 2. Replace all 30 legacy RLS policies
Recreate every policy below with a role-specific name and expression. Manager access means operational `SELECT`/`INSERT`/`UPDATE`; deletion is owner-only, matching the rule that managers cannot delete. Configuration, analytics, and user management remain owner-only.

### Operational access: manager and above
1. `booking_notifications` — `Admins can view notification log` → manager-and-above `SELECT`.
2. `bookings` — `Admins manage bookings` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
3. `car_investments` — `Admins manage car_investments` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
4. `car_maintenance` — `Admins manage car_maintenance` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
5. `cars` — `Admins manage cars` → manager-and-above `INSERT/UPDATE`, owner-and-above `DELETE`; `Admins view all cars` → manager-and-above `SELECT`.
6. `expenses` — `Admins manage expenses` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
7. `housekeeping_comments` — `Admins manage housekeeping_comments` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
8. `housekeeping_tasks` — `Admins manage housekeeping_tasks` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
9. `invoices` — `Admins read invoices` → manager-and-above `SELECT`.
10. `payment_transactions` — `Admins can view payment transactions` → manager-and-above `SELECT`.
11. `properties` — `Admins manage properties` → manager-and-above `INSERT/UPDATE`, owner-and-above `DELETE`; `Admins view all cars` → manager-and-above `SELECT` with a corrected policy name.
12. `property_documents` — `Admins manage car documents` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`, with a corrected policy name.
13. `property_events` — `Admins manage service events` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`, with a corrected policy name.
14. `property_investments` — `Admins manage car_investments` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`, with a corrected policy name.
15. `property_maintenance` — `Admins manage car_maintenance` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`, with a corrected policy name.
16. `room_status` — `Admins manage room_status` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.
17. `signed_contracts` — `Admins manage signed contracts` → manager-and-above `SELECT/INSERT/UPDATE`, owner-and-above `DELETE`.

These inherited short-term tables remain only until step 3; correcting their live access now prevents legacy roles from remaining active in the interim.

### Owner-only configuration and oversight
18. `content_templates` — `Admins manage content templates` → owner-and-above `ALL`.
19. `content_translations` — `Admins manage content_translations` → owner-and-above `ALL`.
20. `contract_templates` — `Admins manage contract templates` → owner-and-above `ALL`.
21. `page_views` — `Admins read page_views` → owner-and-above `SELECT`.
22. `property_settings` — replace all four policies individually:
   - `Admins can delete property settings` → owner-and-above `DELETE`.
   - `Admins can insert property settings` → owner-and-above `INSERT`.
   - `Admins can update property settings` → owner-and-above `UPDATE`.
   - `Admins can view property settings` → owner-and-above `SELECT`.
23. `user_roles` — replace the three overlapping policies individually:
   - `Admins manage roles`
   - `Admins view all roles`
   - `Only admins can modify roles`

   Consolidate them into one owner-and-above read policy and narrowly scoped mutation policies. Preserve `Users view own roles`. The trigger remains the final protection for developer assignments.

## 3. Update every database function using a legacy role
- `has_role` is replaced as described above.
- `analytics_summary` checks owner-level access because analytics is owner-only.
- `admin_get_door_code` uses manager-level access while the inherited function exists; the short-stay door-code function is removed with its underlying field in step 3.
- Confirm no live function definition contains `admin`, `administrator`, or `housekeeper` as a role value after migration.

## 4. Update application authorization
Create one shared role vocabulary/helper and replace legacy role checks throughout the application:

- `getMyRole` returns the raw roles plus `isDeveloper`, `isOwner`, `isManager`, `isTenant`; keep `isAdmin` only as a temporary compatibility alias for `isManager` if a staged edit needs it, then remove it before completion.
- Highest-role display is `developer`, `owner`, `manager`, or `tenant`; remove the legacy `administrator` and `user` fallbacks.
- Operational server functions use manager-level checks: properties, operations, dashboard operations, invoices, and the retained housekeeping/tenant-portal templates.
- Owner-only server functions remain owner-level: API-key management, organization/settings changes, analytics, content/template configuration, translation management, email diagnostics, and user management.
- Update `users.server.ts`, `properties.functions.ts`, `operations.functions.ts`, `dashboard.functions.ts`, `invoices.functions.ts`, `contracts.functions.ts`, `api-keys.functions.ts`, `property-settings.server.ts`, `content-templates.server.ts`, `auto-translate-auth.server.ts`, `translations.functions.ts`, and `email-test.functions.ts` accordingly.
- Convert the retained `/staff` template and `staff-api-auth.server.ts` away from `admin | housekeeper`: its temporary gate accepts manager-and-above only. Tenant authorization is added in step 6 only after lease-scoped data exists; it must never inherit broad housekeeping access.
- Update `housekeeping.functions.ts` role queries and author labels to `manager` semantics without granting tenant access to portfolio-wide data.
- Update admin route/menu gating: manager can enter the operational admin area; settings, users, analytics, content/template configuration, and API settings stay owner-only. Remove legacy role names from comments and labels.
- Update Lithuanian and English role labels to `developer`, `owner`, `manager`, `tenant`.
- Do not edit the generated database types manually; regenerate them through the integration after the live schema migration.

## 5. Separate staff invitations from tenant accounts
- Change the generic Settings invitation flow to staff roles only:
  - owner may invite `owner` or `manager`;
  - developer may additionally invite `developer`;
  - manager and tenant cannot use user management.
- Remove `tenant` from the generic role selector and validator.
- Keep developer accounts untouchable by non-developers; an owner cannot create, change, or delete one.
- Do **not** add a free-standing “invite tenant” action in this step. The future tenant invitation starts from an existing `tenants` record, creates/reuses the auth account, assigns `tenant`, and writes `tenants.user_id`. That flow is implemented with the `tenants` table in step 3 and exposed from tenant detail in step 6. Creating a tenant record must continue to require no login account.

## 6. Verification
### Live database evidence
- Preflight again immediately before migration: enum labels, all role rows, all dependent policies/functions, and grants.
- Apply the checked-in migration through the database migration tool.
- Query the live enum and confirm it contains exactly four labels in hierarchy order.
- Query the live `user_roles` rows and confirm the existing developer assignment is preserved and no legacy role remains.
- Query each of the 30 old policies by table/name and confirm it was removed or replaced by the explicitly listed policy set.
- Query every replacement policy individually from `pg_policies`, checking command, target role, `USING`, and `WITH CHECK`; report any mismatch by table and policy.
- Run a second exhaustive catalog search proving zero policy or function expressions reference `admin`, `administrator`, or `housekeeper` as role values.
- Execute the helper truth table against the existing developer account: developer, owner, and manager checks are true; tenant is false. Confirm anonymous execution is unavailable.
- Run the database linter and report any new security finding.

### Application evidence
- Search all non-generated source for legacy role literals; expected result is zero. Separately report legacy labels that remain only in generated historical types before regeneration, if regeneration is unavailable.
- Run focused type validation and the normal preview validation.
- In an authenticated browser session, verify `/admin`, `/admin/users`, and `/admin/settings` as the existing developer; confirm role label and invitation choices.
- Verify `/`, `/auth`, `/admin`, and `/staff` have no new console errors.
- Report database verification and application verification separately; do not claim a role path was end-to-end tested unless a real account with that role was used.

No core data tables, tenant portal screens, public vacancy pages, or other PLAN.md steps are included. Nothing else in this task.
