-- ============ Step 7: one availability calculation ============
-- The date arithmetic lives in ONE function. Both views below call it directly
-- against the base tables. Deliberately NOT view-on-view: security_invoker is a
-- per-view property, so an invoker view read through a definer view would
-- evaluate units/leases RLS as the real caller (anon) and silently return nothing.

CREATE OR REPLACE FUNCTION public.unit_availability_calc(
  _status text,
  _created_at date,
  _holding_end_date date,
  _holding_renewal boolean,
  _last_finished_end date
)
RETURNS TABLE (available_from date, vacant_since date, vacant_days integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _status = 'vacant' THEN CURRENT_DATE
      WHEN _status = 'occupied' AND _holding_renewal = false AND _holding_end_date IS NOT NULL
        THEN _holding_end_date + 1
      ELSE NULL
    END AS available_from,
    CASE WHEN _status = 'vacant' THEN COALESCE(_last_finished_end, _created_at) END AS vacant_since,
    CASE WHEN _status = 'vacant'
      THEN GREATEST(0, CURRENT_DATE - COALESCE(_last_finished_end, _created_at))
    END AS vacant_days;
$$;

COMMENT ON FUNCTION public.unit_availability_calc(text, date, date, boolean, date) IS
'Canonical availability rule (AGENTS.md 5.7). Vacant unit: available today. Occupied unit whose holding lease has renewal=false and an end_date: available on end_date + 1 (the day AFTER the last contracted day). Anything else: not available. vacant_since = newest end_date of an expired/terminated lease, else the unit creation date. This is the ONLY place the date is computed — public_vacancies, unit_availability, the admin unit list and the dashboard all use it. Touches no tables.';

REVOKE ALL ON FUNCTION public.unit_availability_calc(text, date, date, boolean, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unit_availability_calc(text, date, date, boolean, date) TO anon, authenticated, service_role;

-- ---- Staff/tenant view: RLS of units/leases applies (security_invoker = true)
CREATE OR REPLACE VIEW public.unit_availability
WITH (security_invoker = true) AS
SELECT
  u.id AS unit_id,
  u.status,
  u.is_active,
  u.is_listed,
  h.id          AS holding_lease_id,
  h.tenant_id   AS holding_tenant_id,
  h.start_date  AS holding_start_date,
  h.end_date    AS holding_end_date,
  h.renewal     AS holding_renewal,
  h.monthly_rent AS holding_monthly_rent,
  EXISTS (
    SELECT 1 FROM public.leases f
    WHERE f.unit_id = u.id
      AND f.status IN ('draft','active','ending')
      AND f.start_date > CURRENT_DATE
  ) AS has_future_lease,
  c.available_from,
  c.vacant_since,
  c.vacant_days
FROM public.units u
LEFT JOIN LATERAL (
  SELECT l.id, l.tenant_id, l.start_date, l.end_date, l.renewal, l.monthly_rent
  FROM public.leases l
  WHERE l.unit_id = u.id
    AND l.status IN ('active','ending')
    AND l.start_date <= CURRENT_DATE
    AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  ORDER BY l.end_date NULLS LAST
  LIMIT 1
) h ON true
LEFT JOIN LATERAL (
  SELECT MAX(x.end_date) AS end_date
  FROM public.leases x
  WHERE x.unit_id = u.id AND x.status IN ('expired','terminated')
) fin ON true
CROSS JOIN LATERAL public.unit_availability_calc(
  u.status, u.created_at::date, h.end_date, h.renewal, fin.end_date
) c;

COMMENT ON VIEW public.unit_availability IS
'Per-unit availability for the admin (dashboard, unit list). security_invoker: managers see all units, tenants only their own. Uses unit_availability_calc().';

REVOKE ALL ON public.unit_availability FROM PUBLIC, anon;
GRANT SELECT ON public.unit_availability TO authenticated, service_role;

-- ---- Public view: definer (anon has no RLS on base tables), same function, same base tables
DROP VIEW IF EXISTS public.public_vacancies;
CREATE VIEW public.public_vacancies
WITH (security_invoker = off) AS
SELECT u.id, u.name, u.unit_number, u.description, u.city, u.address,
       b.name AS building_name, u.area_m2, u.room_count, u.floor,
       u.monthly_rent, u.deposit, u.amenities, u.cover_image_url, u.image_urls,
       c.available_from,
       (u.status = 'vacant') AS vacant_now
FROM public.units u
LEFT JOIN public.buildings b ON b.id = u.building_id
LEFT JOIN LATERAL (
  SELECT l.end_date, l.renewal
  FROM public.leases l
  WHERE l.unit_id = u.id
    AND l.status IN ('active','ending')
    AND l.start_date <= CURRENT_DATE
    AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  ORDER BY l.end_date NULLS LAST
  LIMIT 1
) h ON true
CROSS JOIN LATERAL public.unit_availability_calc(
  u.status, u.created_at::date, h.end_date, h.renewal, NULL::date
) c
WHERE u.is_active AND u.is_listed
  AND c.available_from IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.leases f
    WHERE f.unit_id = u.id
      AND f.status IN ('draft','active','ending')
      AND f.start_date > CURRENT_DATE
  );

COMMENT ON VIEW public.public_vacancies IS
'Public listing (anon). Same availability rule as unit_availability via unit_availability_calc(); reads base tables directly, never another view.';

GRANT SELECT ON public.public_vacancies TO anon, authenticated;