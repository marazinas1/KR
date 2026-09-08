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

## Later
- Step 4 admin units/tenants/leases (rebuilds the unit management screens removed above)
- Step 5 public vacancy site; Step 6 tenant portal; Step 7 dashboard
- Step 8 charges/invoices rebuilt against leases (invoice engine is currently unused)
- Step 10 lease/reading/payment notification jobs (runScheduledNotifications is a stub)
