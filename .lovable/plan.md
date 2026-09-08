# Step 7 — Admin dashboard ("morning screen")

## 0. One availability calculation, not three

Today there are already **two** implementations of "when is this unit free", and they disagree:

| Where | available_from for occupied unit with renewal=false | vacant-since |
|---|---|---|
| `public_vacancies` view (SQL) | `end_date + 1` | not computed |
| `listUnits` in `units.functions.ts` (TS) | `end_date` | max end_date of expired/terminated leases, else `units.created_at` |

The dashboard will **not** add a third. One shared calculation, but **no view stacked on another view** — `security_invoker` is a per-view property fixed at that view's own rewrite, not inherited, so an invoker view read through a definer view would evaluate `units`/`leases` RLS as `anon` and silently return nothing to public visitors. Instead the logic lives in a **SQL function** that both views call directly against the base tables:

```text
public.unit_availability_calc(
  _status text, _created_at date,
  _holding_end_date date, _holding_renewal boolean,
  _last_finished_end date
) RETURNS TABLE (available_from date, vacant_since date, vacant_days integer)
LANGUAGE sql IMMUTABLE-in-spirit (STABLE, reads CURRENT_DATE), no table access,
SET search_path = public

available_from := CASE
    WHEN _status = 'vacant' THEN CURRENT_DATE
    WHEN _status = 'occupied' AND _holding_renewal = false AND _holding_end_date IS NOT NULL
         THEN _holding_end_date + 1
    ELSE NULL END
vacant_since := CASE WHEN _status = 'vacant'
    THEN COALESCE(_last_finished_end, _created_at) ELSE NULL END
vacant_days  := CASE WHEN _status = 'vacant'
    THEN CURRENT_DATE - COALESCE(_last_finished_end, _created_at) ELSE NULL END
```

The function touches **no tables**, so it has no RLS behaviour of its own and is safe to grant to `anon` and `authenticated`. Each caller does its own row selection under its own security model:

- `public.unit_availability` — `security_invoker = true`, selects `units` + LATERAL holding lease + LATERAL last finished lease + `has_future_lease` **from the base tables**, and passes those scalars into `unit_availability_calc(...)`. Managers see all rows, tenants only their own. Used by the dashboard and `listUnits`.
- `public.public_vacancies` — recreated with `security_invoker = off` (unchanged), also reading `units`/`leases`/`buildings` **directly from the base tables** and calling the same function. It does **not** read `unit_availability`. Output columns stay byte-identical, so step 5 code needs no change.

Holding lease = `status IN ('active','ending') AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE)`, ordered by `end_date NULLS LAST`, limit 1 — identical to `HOLDING_LEASE_STATUSES` in TS and to the existing LATERAL. Last finished end = `max(end_date)` over `status IN ('expired','terminated')`. `has_future_lease` = exists `status IN ('draft','active','ending') AND start_date > CURRENT_DATE`. Both views repeat this row-selection SQL (it is the part that must run under different security models); only the date arithmetic is shared — that is exactly the piece that drifted.

`listUnits` drops its TS recomputation and reads `vacant_days`, `available_from`, `holding_*` from `unit_availability`.

**Decision to confirm:** the canonical date becomes `end_date + 1` (the day after the last contracted day — what the public site already shows). `listUnits` currently shows `end_date`; it will change by one day. Say so if you want `end_date` instead; the function is the only place to change it.


## 1. Cards and their exact logic

All queries run inside one server function `getDashboard` (new `src/lib/dashboard.functions.ts`, `requireManager`), in parallel, as the signed-in user (RLS applies). `today = CURRENT_DATE` in SQL / `todayIso()` in TS. Each card returns a count/sum plus up to 5 preview rows.

**1. Leases expiring (30 / 60 / 90)**
```sql
SELECT l.id, l.unit_id, l.tenant_id, l.end_date, l.renewal, (l.end_date - CURRENT_DATE) AS days_left
FROM leases l
WHERE l.status IN ('active','ending') AND l.end_date IS NOT NULL
  AND l.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
ORDER BY l.end_date;
```
Bucketed in TS into ≤30 / 31–60 / 61–90. Rows with `renewal=false` get a "moving out" badge (same field the public site uses). Link: `/admin/units?filter=expiring&days=30|60|90`.

**2. Vacant units with days empty**
`SELECT unit_id, vacant_days FROM unit_availability WHERE status='vacant' AND is_active ORDER BY vacant_days DESC` — count + total; preview shows longest-empty first. Secondary line: units becoming vacant (`status='occupied' AND available_from IS NOT NULL`). Link: `/admin/units?status=vacant` (already a supported filter; sort by vacant_days desc).

**3. Missing meter readings this period**
Period = `currentPeriod()` (first day of current month, moved from `tenant-portal.functions.ts` to `rental.ts` and reused — same definition the tenant portal submits against).
```text
expected = active meters (meters.is_active) that belong to
           a unit with a holding lease (via unit_availability.holding_lease_id IS NOT NULL)
           OR to a building (shared meters)
present  = meter_readings WHERE period = :period AND status IN ('submitted','approved')
missing  = expected − present
```
Card: "X of Y units missing" (grouped by unit; building meters counted as one row "shared: <building>"), plus "N submitted awaiting review" (`status='submitted'` for any period). Link: `/admin/units?filter=missing_readings`. Review link opens the unit's meters tab.

**4. Open faults by priority**
```sql
SELECT id, unit_id, title, priority, status, created_at
FROM issues WHERE status IN ('new','acknowledged','in_progress','waiting')
ORDER BY array_position(ARRAY['urgent','high','normal','low'], priority), created_at;
```
Count per priority; preview = top 5. Link: new route `/admin/issues` (a plain list with status/priority filters — the admin has no cross-unit issue list yet; rows link to the unit's faults tab).

**5. Debtors**
```sql
SELECT l.id AS lease_id, l.unit_id, l.tenant_id,
       COALESCE(SUM(c.amount),0) - COALESCE(p.paid,0) AS balance
FROM leases l
LEFT JOIN charges c  ON c.lease_id = l.id AND c.period <= CURRENT_DATE
LEFT JOIN LATERAL (SELECT SUM(amount) paid FROM payments WHERE lease_id = l.id) p ON true
WHERE l.status IN ('active','ending','expired','terminated')
GROUP BY l.id, p.paid
HAVING COALESCE(SUM(c.amount),0) - COALESCE(p.paid,0) > 0
ORDER BY balance DESC;
```
Implemented in TS over `charges` + `payments` selects (same arithmetic as `getMyBalance` in the tenant portal: charged − paid). Card shows number of debtors and total outstanding. Until step 8 generates charges this is honestly 0 / 0 €; the card says so rather than hiding. Link: `/admin/units?filter=debtors`.

**6. New inquiries** — `SELECT count(*) FROM rental_inquiries WHERE status='new'` + 5 newest. Link: `/admin/inquiries?status=new`.

**7. Documents expiring** — `documents WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_DATE + 30 ORDER BY expires_at` (already-expired included, shown red). Link: unit / tenant detail documents tab per row.

**8. Occupancy and rent roll** (top strip) — from `unit_availability` + `units`: occupied = `holding_lease_id IS NOT NULL`; occupancy = occupied / active units; rent roll = `SUM(leases.monthly_rent)` over holding leases.

## 2. UI

- `admin.index.tsx` replaced: top strip of four `KpiCard`s (occupancy, rent roll, vacant, debt total), then a responsive grid of the six action cards. Each card = header with count + "view all" link, compact preview list where every row links to the unit/tenant/inquiry. Empty state per card ("Nothing to do") — no decoration.
- `PeriodFilter` is not used: this screen is "today", not a period report.
- `admin.units.index.tsx`: existing `useState` filters move to `validateSearch` (`q`, `building`, `status`, `listed`, `filter: expiring|missing_readings|debtors`, `days`), so dashboard links land pre-filtered and are shareable. `listUnits` gains the per-unit `balance` and `missing_readings_count` columns needed for those filters (from the same queries above, so the list and the card can never disagree).
- `admin.inquiries.tsx`: `status` becomes a search param.
- New `admin.issues.tsx` list route + nav entry.
- All strings in `lt.json` / `en.json` under `dashboard.*`.

## 3. Technical details

- Migration: `CREATE VIEW public.unit_availability (security_invoker=true)`; `GRANT SELECT TO authenticated`; `DROP VIEW public_vacancies; CREATE VIEW public_vacancies ... security_invoker=off` on top of it; `GRANT SELECT TO anon, authenticated`; `COMMENT ON VIEW` documenting the `end_date + 1` rule. No table changes, no data.
- Files: new `dashboard.functions.ts`, `admin.issues.tsx`, `DashboardCard.tsx`; edits to `admin.index.tsx`, `admin.units.index.tsx`, `admin.inquiries.tsx`, `admin.tsx` (nav), `units.functions.ts`, `rental.ts`, `tenant-portal.functions.ts` (import `currentPeriod` from `rental.ts`), locale files.
- Roles: `getDashboard` and `listIssues` require manager; tenants hitting `/admin` are already redirected.

## 4. Verification (real output will be printed)

1. `pg_views` definition of `unit_availability` and new `public_vacancies`; `SELECT ... FROM public_vacancies` as anon returns HTTP 200 (nested definer→invoker view works for anon).
2. Fixture: one vacant unit (created 12 days ago), one occupied with `renewal=false, end_date = today+20`, one occupied open-ended, one with a future draft lease. Print `unit_availability`, `public_vacancies`, `listUnits` output side by side — identical `available_from` / `vacant_days` in all three.
3. Expiring buckets: leases at +20, +45, +80, +95 days → counts 1/1/1, the +95 excluded.
4. Missing readings: 2 active meters, one reading submitted → card "1 of 2".
5. Debtors: charge 100 + payment 40 → balance 60 shown; lease with 0 balance excluded.
6. Tenant-role signed-in read of `unit_availability` returns only own unit.
7. Browser: dashboard renders, each card link lands on the correctly filtered list.
8. `bunx tsgo --noEmit`, production build, fixture cleanup counts = 0.
