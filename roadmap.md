# Roadmap

## Step 3 — Core data model (done)
- [x] Migration: conversions (units, unit_events, documents, org_settings) + new tables + RLS + CHECKs
- [x] btree_gist before the leases exclusion constraint; NULL end_date = infinity
- [x] meter_readings trigger: first reading compares against meters.initial_reading; trigger always computes consumption
- [x] Private buckets: documents, meter-photos, issue-photos; public unit-photos
- [x] Code pass: properties→units, property_settings→org_settings, removed booking/nightly readers
      (deleted: invoices.server/functions, dashboard.functions, InvoiceViewerDialog, api-public.server,
       /api/public/v1/properties*, payment-details, admin.properties.* screens, PropertyForm, lib/properties.ts;
       notifications.server reduced to sendEmail/templates/settings; settings sections rebuilt for long-term rental)
- [x] Verification: tsgo clean, production build clean, org_settings columns match the settings map

## Step 4 — Admin: units, tenants, leases (done)
- [x] /admin/units list: search, building/status/listed filters, vacancy days, free-from date, listed toggle
- [x] Unit form: status/building as selects mirroring the DB CHECK values; photos to the unit-photos bucket
- [x] Unit detail tabs: overview, lease, meters, issues, documents, costs, timeline
- [x] Lease: create, future notice (renewal=false + end_date), renew, immediate-only terminate
- [x] Tenants list + detail (leases, documents, owner-only identity tab)
- [x] Sidebar links + lt/en translations; tsgo clean, production build clean, screens load signed in

## Step 5 — Public vacancy site (done)
- [x] Public LT/EN pages reading `public_vacancies`; inquiry form → `rental_inquiries` (DB rate limit)
- [x] Admin "Užklausos": status change, atomic convert-to-draft-lease (`convert_inquiry_to_lease`)
- [ ] Deferred: new-inquiry email to owners (step 10)

## Step 6 — Tenant portal (done)
- [x] Migration: tenant policies for shared building meters (meters + meter_readings), decision comment on tenant_owns_lease
- [x] `/nuomininkas` layout + home, readings, faults (+ detail), documents; delete `/staff` template
- [x] `tenant-portal.functions.ts`: lease, meters (unit + building shared), submit reading, issues, comments, documents, balance
- [x] submitMyReading meter check = same scope as getMyMeters (own unit + own building shared meters)
- [x] Invite to portal from tenant detail — v1: primary tenant on a lease only (lease_occupants not covered), documented in code
- [x] Login redirect: tenant-only users → /nuomininkas
- [x] Verification with printed results, esp. cross-tenant isolation (items 3 and 4)

## Step 7 — Dashboard (in progress)
- [ ] Migration: `unit_availability_calc()` function (end_date + 1 canonical), `unit_availability` view (invoker), `public_vacancies` recreated on the same function — no view-on-view
- [ ] `listUnits` reads availability from the view (drops TS recomputation)
- [ ] `getDashboard`: expiring 30/60/90, vacant + days, missing readings, open issues, debtors, new inquiries, expiring documents, occupancy/rent roll
- [ ] Dashboard UI; units list `validateSearch` filters; inquiries `status` param; new `/admin/issues` list
- [ ] Verification with printed results: anon rows from public_vacancies (real content), anon permission denied on unit_availability, fixture parity, tsgo, build, cleanup = 0

## Later
- Step 8 charges/invoices rebuilt against leases (invoice engine is currently unused)
- Step 10 lease/reading/payment notification jobs (runScheduledNotifications is a stub)
