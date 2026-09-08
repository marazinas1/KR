-- Convert a public rental inquiry into a DRAFT lease.
--
-- Everything happens inside this one function call, i.e. one transaction:
-- if the lease insert is rejected by `leases_no_overlap`, the tenant row
-- created a few lines earlier is rolled back with it. That is deliberate —
-- a failed conversion must never leave an orphan tenant behind.
CREATE OR REPLACE FUNCTION public.convert_inquiry_to_lease(
  _inquiry_id uuid,
  _unit_id uuid,
  _start_date date,
  _monthly_rent numeric,
  _deposit numeric,
  _payment_day integer,
  _notice_days integer,
  _tenant_id uuid DEFAULT NULL,
  _first_name text DEFAULT '',
  _last_name text DEFAULT '',
  _phone text DEFAULT '',
  _email text DEFAULT '',
  _end_date date DEFAULT NULL,
  _notes text DEFAULT ''
)
RETURNS TABLE (lease_id uuid, tenant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_lease uuid;
BEGIN
  IF NOT public.is_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _tenant_id IS NOT NULL THEN
    v_tenant := _tenant_id;
  ELSE
    INSERT INTO public.tenants (first_name, last_name, phone, email, notes)
    VALUES (
      COALESCE(NULLIF(btrim(_first_name), ''), 'Nuomininkas'),
      COALESCE(_last_name, ''),
      COALESCE(_phone, ''),
      COALESCE(_email, ''),
      COALESCE(_notes, '')
    )
    RETURNING id INTO v_tenant;
  END IF;

  -- A converted inquiry always produces a DRAFT lease, never an active one.
  INSERT INTO public.leases (
    unit_id, tenant_id, start_date, end_date, monthly_rent, deposit,
    payment_day, notice_days, status, renewal
  )
  VALUES (
    _unit_id, v_tenant, _start_date, _end_date, COALESCE(_monthly_rent, 0),
    COALESCE(_deposit, 0), COALESCE(_payment_day, 1), COALESCE(_notice_days, 30),
    'draft', true
  )
  RETURNING id INTO v_lease;

  UPDATE public.rental_inquiries
     SET status = 'converted',
         converted_lease_id = v_lease,
         handled_by = auth.uid(),
         unit_id = COALESCE(unit_id, _unit_id),
         updated_at = now()
   WHERE id = _inquiry_id;

  RETURN QUERY SELECT v_lease, v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_inquiry_to_lease(uuid, uuid, date, numeric, numeric, integer, integer, uuid, text, text, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_inquiry_to_lease(uuid, uuid, date, numeric, numeric, integer, integer, uuid, text, text, text, text, date, text) TO authenticated, service_role;

-- Public inquiry submissions are rate limited per IP using timestamped rows in
-- `api_request_log` (a durable database table). Cloudflare Workers are
-- stateless between invocations, so an in-memory counter would not survive;
-- this index keeps the "how many hits from this IP in the last hour" lookup cheap.
CREATE INDEX IF NOT EXISTS api_request_log_ip_created_idx
  ON public.api_request_log (ip, created_at DESC);