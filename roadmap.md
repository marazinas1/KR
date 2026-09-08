# Roadmap

## Step 3 — Core data model (in progress)
- [ ] Migration: conversions (units, unit_events, documents, org_settings) + 13 new tables + RLS + CHECKs
- [ ] btree_gist before the leases exclusion constraint; NULL end_date = infinity
- [ ] meter_readings trigger: first reading compares against meters.initial_reading; trigger always computes consumption
- [ ] Private buckets: documents, meter-photos, issue-photos; public unit-photos; drop car-images
- [ ] Code pass: properties→units, property_settings→org_settings, remove booking/nightly readers
- [ ] Verification: pg_policies, tenant_identity as manager, public_vacancies as anon, exclusion tests (overlap + NULL end), reading trigger, tsgo, build

## Later
- Step 4 admin units/tenants/leases; Step 5 public vacancy site; Step 6 tenant portal; Step 7 dashboard
