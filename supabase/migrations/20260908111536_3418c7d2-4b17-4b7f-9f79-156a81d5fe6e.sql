-- Step 6: tenant portal — shared building meters + documented v1 scope.

-- v1 DECISION (do not rediscover): portal access is scoped through the PRIMARY
-- tenant on a lease (leases.tenant_id). Rows in lease_occupants do NOT grant
-- portal access; a tenant record that only ever appears as an occupant cannot
-- be invited to the portal (the admin hides the invite action for them).
-- Extending this to occupants would require changing current_tenant_id() /
-- tenant_owns_lease() / tenant_owns_unit() together with every policy that
-- calls them — a separate, deliberate step.
COMMENT ON FUNCTION public.tenant_owns_lease(uuid) IS
  'v1: true only for the PRIMARY tenant (leases.tenant_id) on an active/ending lease. lease_occupants are intentionally not covered.';
COMMENT ON FUNCTION public.tenant_owns_unit(uuid) IS
  'v1: true only for the PRIMARY tenant (leases.tenant_id) holding the unit via an active/ending lease. lease_occupants are intentionally not covered.';

-- A tenant "owns" a building when one of their held units is in it. Used for
-- shared (common) meters that have building_id set and unit_id NULL.
CREATE OR REPLACE FUNCTION public.tenant_owns_building(_building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.units u ON u.id = l.unit_id
    WHERE u.building_id = _building_id
      AND l.tenant_id = public.current_tenant_id()
      AND l.status IN ('active','ending')
  )
$$;
REVOKE ALL ON FUNCTION public.tenant_owns_building(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_owns_building(uuid) TO authenticated, service_role;

-- Meters: own unit meters + shared meters of the building the unit is in.
DROP POLICY IF EXISTS "Tenants read own meters" ON public.meters;
CREATE POLICY "Tenants read own meters" ON public.meters
  FOR SELECT TO authenticated
  USING (
    (unit_id IS NOT NULL AND public.tenant_owns_unit(unit_id))
    OR (unit_id IS NULL AND building_id IS NOT NULL AND public.tenant_owns_building(building_id))
  );

-- Readings: same scope as the meters the tenant can see.
DROP POLICY IF EXISTS "Tenants read own readings" ON public.meter_readings;
CREATE POLICY "Tenants read own readings" ON public.meter_readings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meters m
    WHERE m.id = meter_readings.meter_id
      AND (
        (m.unit_id IS NOT NULL AND public.tenant_owns_unit(m.unit_id))
        OR (m.unit_id IS NULL AND m.building_id IS NOT NULL AND public.tenant_owns_building(m.building_id))
      )
  ));

DROP POLICY IF EXISTS "Tenants submit readings" ON public.meter_readings;
CREATE POLICY "Tenants submit readings" ON public.meter_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'submitted'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.meters m
      WHERE m.id = meter_readings.meter_id
        AND (
          (m.unit_id IS NOT NULL AND public.tenant_owns_unit(m.unit_id))
          OR (m.unit_id IS NULL AND m.building_id IS NOT NULL AND public.tenant_owns_building(m.building_id))
        )
    )
  );