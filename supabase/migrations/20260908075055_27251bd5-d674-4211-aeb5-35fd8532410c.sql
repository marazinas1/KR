CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============ 1. DROP UNUSED ============
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_door_code(uuid);
DROP FUNCTION IF EXISTS public.get_active_booked_dates();
DROP FUNCTION IF EXISTS public.get_property_booked_dates(uuid);

-- ============ 2. BUILDINGS ============
CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'LT',
  kind text NOT NULL DEFAULT 'apartment_building'
    CHECK (kind IN ('apartment_building','dormitory','house','other')),
  lat numeric, lng numeric,
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER buildings_touch BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 3. PROPERTIES -> UNITS ============
ALTER TABLE public.properties RENAME TO units;
ALTER TABLE public.units
  DROP COLUMN IF EXISTS price_per_night,
  DROP COLUMN IF EXISTS price_tiers,
  DROP COLUMN IF EXISTS max_guests,
  DROP COLUMN IF EXISTS beds,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS ical_import_url,
  DROP COLUMN IF EXISTS ical_last_sync_at,
  DROP COLUMN IF EXISTS ical_last_status,
  DROP COLUMN IF EXISTS extra_services,
  DROP COLUMN IF EXISTS door_code,
  DROP COLUMN IF EXISTS property_type,
  DROP COLUMN IF EXISTS rooms,
  DROP COLUMN IF EXISTS status;
ALTER TABLE public.units
  ADD COLUMN building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN unit_number text NOT NULL DEFAULT '',
  ADD COLUMN floor integer,
  ADD COLUMN room_count integer NOT NULL DEFAULT 1,
  ADD COLUMN monthly_rent numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN deposit numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN status text NOT NULL DEFAULT 'vacant'
    CHECK (status IN ('vacant','occupied','reserved','renovation','inactive')),
  ADD COLUMN is_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN notes text NOT NULL DEFAULT '';
CREATE INDEX idx_units_building ON public.units(building_id);
CREATE INDEX idx_units_status ON public.units(status);

-- ============ 4. EVENTS / DOCS / OPERATIONS ============
ALTER TABLE public.property_events RENAME TO unit_events;
ALTER TABLE public.unit_events RENAME COLUMN property_id TO unit_id;
ALTER TABLE public.unit_events RENAME COLUMN reason TO kind;
ALTER TABLE public.unit_events DROP COLUMN IF EXISTS mileage_km;
ALTER TABLE public.unit_events ALTER COLUMN kind SET DEFAULT 'other';
ALTER TABLE public.unit_events ADD CONSTRAINT unit_events_kind_check
  CHECK (kind IN ('occupied','vacated','renovation','inspection','other'));

ALTER TABLE public.property_documents RENAME TO documents;
ALTER TABLE public.documents RENAME COLUMN property_id TO unit_id;
ALTER TABLE public.documents ALTER COLUMN unit_id DROP NOT NULL;
ALTER TABLE public.documents
  ADD COLUMN lease_id uuid,
  ADD COLUMN tenant_id uuid,
  ADD COLUMN bucket text NOT NULL DEFAULT 'documents';
ALTER TABLE public.documents ALTER COLUMN kind SET DEFAULT 'other';
ALTER TABLE public.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN ('lease_contract','act','id_document','invoice','insurance','inspection','house_rules','other'));
ALTER TABLE public.documents ADD CONSTRAINT documents_attached_check
  CHECK (unit_id IS NOT NULL OR lease_id IS NOT NULL OR tenant_id IS NOT NULL);

ALTER TABLE public.property_investments RENAME COLUMN property_id TO unit_id;
ALTER TABLE public.property_investments DROP COLUMN IF EXISTS mileage_km;
ALTER TABLE public.property_maintenance RENAME COLUMN property_id TO unit_id;
ALTER TABLE public.property_maintenance DROP COLUMN IF EXISTS due_mileage_km;
ALTER TABLE public.expenses RENAME COLUMN property_id TO unit_id;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS mileage_km;

-- ============ 5. TENANTS ============
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  user_id uuid UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_touch BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tenant_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  personal_code text NOT NULL DEFAULT '',
  id_doc_type text NOT NULL DEFAULT '',
  id_doc_number text NOT NULL DEFAULT '',
  issued_by text NOT NULL DEFAULT '',
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_identity TO authenticated;
GRANT ALL ON public.tenant_identity TO service_role;
ALTER TABLE public.tenant_identity ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenant_identity_touch BEFORE UPDATE ON public.tenant_identity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 6. LEASES ============
CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric(10,2) NOT NULL DEFAULT 0,
  deposit numeric(10,2) NOT NULL DEFAULT 0,
  deposit_paid numeric(10,2) NOT NULL DEFAULT 0,
  payment_day integer NOT NULL DEFAULT 10 CHECK (payment_day BETWEEN 1 AND 28),
  notice_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','ending','expired','terminated')),
  renewal boolean NOT NULL DEFAULT true,
  terminated_at timestamptz,
  termination_reason text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leases_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
  -- An open-ended lease (end_date IS NULL) is treated as running to 'infinity',
  -- so it collides with any later lease on the same unit.
  CONSTRAINT leases_no_overlap EXCLUDE USING gist (
    unit_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
  ) WHERE (status <> 'terminated')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER leases_touch BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_leases_unit ON public.leases(unit_id);
CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);

ALTER TABLE public.documents
  ADD CONSTRAINT documents_lease_fk FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  ADD CONSTRAINT documents_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE TABLE public.lease_occupants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  relation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_occupants TO authenticated;
GRANT ALL ON public.lease_occupants TO service_role;
ALTER TABLE public.lease_occupants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER lease_occupants_touch BEFORE UPDATE ON public.lease_occupants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 7. METERS ============
CREATE TABLE public.meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('electricity_day','electricity_night','cold_water','hot_water','gas','heating')),
  serial_number text NOT NULL DEFAULT '',
  uom text NOT NULL DEFAULT 'kWh',
  initial_reading numeric(12,3) NOT NULL DEFAULT 0,
  digits integer,
  is_active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meters_owner_check CHECK (num_nonnulls(unit_id, building_id) = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meters TO authenticated;
GRANT ALL ON public.meters TO service_role;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER meters_touch BEFORE UPDATE ON public.meters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id uuid NOT NULL REFERENCES public.meters(id) ON DELETE CASCADE,
  period date NOT NULL,
  value numeric(12,3) NOT NULL,
  consumption numeric(12,3) NOT NULL DEFAULT 0,
  photo_path text NOT NULL DEFAULT '',
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','approved','rejected')),
  needs_review boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text NOT NULL DEFAULT '',
  superseded_by uuid REFERENCES public.meter_readings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meter_readings_period_check CHECK (period = date_trunc('month', period)::date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meter_readings TO authenticated;
GRANT ALL ON public.meter_readings TO service_role;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER meter_readings_touch BEFORE UPDATE ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE UNIQUE INDEX meter_readings_one_per_period
  ON public.meter_readings(meter_id, period) WHERE status <> 'rejected';

-- Validation + consumption.
-- Baseline rule: the previous accepted reading for the meter is the latest
-- APPROVED reading with an earlier period. When there is none (the very first
-- reading for that meter) the baseline is meters.initial_reading -- the check is
-- NOT skipped. consumption is ALWAYS computed here (value - baseline) and any
-- value supplied by the caller is overwritten, so it can never drift from the
-- real difference.
CREATE OR REPLACE FUNCTION public.validate_meter_reading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  baseline numeric(12,3);
  prev_consumption numeric(12,3);
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  SELECT r.value INTO baseline
  FROM public.meter_readings r
  WHERE r.meter_id = NEW.meter_id
    AND r.status = 'approved'
    AND r.period < NEW.period
    AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
  ORDER BY r.period DESC
  LIMIT 1;

  IF baseline IS NULL THEN
    SELECT m.initial_reading INTO baseline FROM public.meters m WHERE m.id = NEW.meter_id;
  END IF;
  baseline := COALESCE(baseline, 0);

  IF NEW.value < baseline THEN
    RAISE EXCEPTION 'Rodmuo (%) negali buti mazesnis uz ankstesni patvirtinta rodmeni (%).', NEW.value, baseline;
  END IF;

  NEW.consumption := NEW.value - baseline;

  SELECT r.consumption INTO prev_consumption
  FROM public.meter_readings r
  WHERE r.meter_id = NEW.meter_id
    AND r.status = 'approved'
    AND r.period < NEW.period
    AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
  ORDER BY r.period DESC
  LIMIT 1;

  NEW.needs_review := prev_consumption IS NOT NULL
    AND prev_consumption > 0
    AND NEW.consumption > prev_consumption * 5;

  RETURN NEW;
END;
$$;
CREATE TRIGGER meter_readings_validate
  BEFORE INSERT OR UPDATE OF value, status, period ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.validate_meter_reading();

CREATE TABLE public.utility_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL
    CHECK (type IN ('electricity_day','electricity_night','cold_water','hot_water','gas','heating')),
  effective_from date NOT NULL,
  price_per_unit numeric(10,4) NOT NULL DEFAULT 0,
  fixed_monthly numeric(10,2) NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, effective_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_rates TO authenticated;
GRANT ALL ON public.utility_rates TO service_role;
ALTER TABLE public.utility_rates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER utility_rates_touch BEFORE UPDATE ON public.utility_rates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 8. MONEY ============
CREATE TABLE public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  period date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('rent','utility','fixed','one_off','penalty')),
  meter_reading_id uuid REFERENCES public.meter_readings(id) ON DELETE SET NULL,
  utility_rate_id uuid REFERENCES public.utility_rates(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price numeric(10,4) NOT NULL DEFAULT 0,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER charges_touch BEFORE UPDATE ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'bank' CHECK (method IN ('bank','cash','other')),
  reference text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER payments_touch BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 9. ISSUES ============
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  reported_by uuid,
  reporter_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  photo_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','acknowledged','in_progress','waiting','resolved','rejected')),
  assigned_to uuid,
  cost numeric(10,2),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER issues_touch BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id uuid,
  author_role text NOT NULL DEFAULT '',
  body text NOT NULL,
  photo_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_comments TO authenticated;
GRANT ALL ON public.issue_comments TO service_role;
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

-- ============ 10. RENTAL INQUIRIES ============
CREATE TABLE public.rental_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  move_in_date date,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','viewing_scheduled','converted','dismissed')),
  handled_by uuid,
  converted_lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'public_site',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_inquiries TO authenticated;
GRANT INSERT ON public.rental_inquiries TO anon;
GRANT ALL ON public.rental_inquiries TO service_role;
ALTER TABLE public.rental_inquiries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER rental_inquiries_touch BEFORE UPDATE ON public.rental_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 11. ORG SETTINGS ============
CREATE TABLE public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  display_name text,
  address text, city text, postal_code text, country text NOT NULL DEFAULT 'LT',
  lat numeric, lng numeric,
  timezone text NOT NULL DEFAULT 'Europe/Vilnius',
  currency text NOT NULL DEFAULT 'EUR',
  default_language text NOT NULL DEFAULT 'lt',
  phone text, email text,
  vat_rate numeric NOT NULL DEFAULT 21,
  payment_methods jsonb NOT NULL DEFAULT '["bank"]'::jsonb,
  payment_due_day integer NOT NULL DEFAULT 10,
  default_notice_days integer NOT NULL DEFAULT 30,
  reading_window_from_day integer NOT NULL DEFAULT 25,
  reading_window_to_day integer NOT NULL DEFAULT 5,
  require_meter_photo boolean NOT NULL DEFAULT true,
  invoice_series text,
  invoice_next_number integer NOT NULL DEFAULT 1,
  invoice_issuer_name text NOT NULL DEFAULT '',
  invoice_logo_url text,
  invoice_notes text,
  company_name text, company_code text, company_vat_code text, company_address text,
  iban text, bank_name text,
  brand_primary_color text NOT NULL DEFAULT '#1f2937',
  brand_secondary_color text NOT NULL DEFAULT '#6b7280',
  brand_logo_url text, brand_email_logo_url text, brand_pdf_logo_url text,
  notify_reading_reminder boolean NOT NULL DEFAULT true,
  notify_lease_expiring boolean NOT NULL DEFAULT true,
  notify_payment_overdue boolean NOT NULL DEFAULT true,
  notify_issue_update boolean NOT NULL DEFAULT true,
  notify_new_inquiry boolean NOT NULL DEFAULT true,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER org_settings_touch BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.org_settings (
  display_name, address, city, postal_code, country, lat, lng, timezone, currency,
  default_language, phone, email, vat_rate, payment_methods, invoice_series,
  invoice_next_number, invoice_issuer_name, invoice_logo_url, invoice_notes,
  company_name, company_code, company_vat_code, company_address, iban, bank_name,
  brand_primary_color, brand_secondary_color, brand_logo_url, brand_email_logo_url,
  brand_pdf_logo_url, integrations, updated_by
)
SELECT
  ps.display_name, ps.address, ps.city, ps.postal_code, COALESCE(ps.country,'LT'),
  ps.lat, ps.lng, COALESCE(ps.timezone,'Europe/Vilnius'), COALESCE(ps.currency,'EUR'),
  COALESCE(ps.default_language,'lt'), ps.phone, ps.email, COALESCE(ps.vat_rate,21),
  '["bank"]'::jsonb, ps.invoice_series, COALESCE(ps.invoice_next_number,1),
  COALESCE(ps.invoice_issuer_name,''), ps.invoice_logo_url, ps.invoice_notes,
  ps.company_name, ps.company_code, ps.company_vat_code, ps.company_address,
  ps.iban, ps.bank_name,
  COALESCE(ps.brand_primary_color,'#1f2937'), COALESCE(ps.brand_secondary_color,'#6b7280'),
  ps.brand_logo_url, ps.brand_email_logo_url, ps.brand_pdf_logo_url,
  COALESCE(ps.integrations,'{}'::jsonb), ps.updated_by
FROM public.property_settings ps
WHERE ps.scope = 'global'
LIMIT 1;

INSERT INTO public.org_settings (singleton)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.org_settings);

DROP TABLE public.property_settings CASCADE;
DROP FUNCTION IF EXISTS public.set_property_settings_updated_at();

CREATE OR REPLACE FUNCTION public.claim_invoice_number()
RETURNS TABLE(series text, number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_series text;
  v_number integer;
BEGIN
  UPDATE public.org_settings
  SET invoice_next_number = invoice_next_number + 1
  WHERE singleton
  RETURNING invoice_series, invoice_next_number - 1 INTO v_series, v_number;

  IF v_number IS NULL THEN
    RAISE EXCEPTION 'org_settings eilute nerasta.';
  END IF;

  RETURN QUERY SELECT v_series, v_number;
END;
$$;

-- ============ 12. TENANT SCOPING HELPERS ============
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tenant_owns_lease(_lease_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = _lease_id
      AND l.tenant_id = public.current_tenant_id()
      AND l.status IN ('active','ending')
  )
$$;

CREATE OR REPLACE FUNCTION public.tenant_owns_unit(_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.unit_id = _unit_id
      AND l.tenant_id = public.current_tenant_id()
      AND l.status IN ('active','ending')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_owns_lease(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_owns_unit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_owns_lease(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_owns_unit(uuid) TO authenticated, service_role;

-- ============ 13. POLICIES ============
-- Manager-operational tables: manager reads/writes, owner deletes.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'buildings','tenants','leases','lease_occupants','meters','meter_readings',
    'charges','payments','issues','issue_comments','documents','unit_events'
  ] LOOP
    EXECUTE format('CREATE POLICY "Managers read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Managers insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Managers update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Owners delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_owner(auth.uid()))', t);
  END LOOP;
END $$;

-- units already carries the step-2 manager policy set (renamed with the table).

-- tenant_identity: owner + developer only.
CREATE POLICY "Owners manage tenant identity" ON public.tenant_identity
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- utility_rates: managers read, owners manage.
CREATE POLICY "Managers read utility rates" ON public.utility_rates
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Owners manage utility rates" ON public.utility_rates
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- org_settings: owners manage, managers read (deliberate change from step 2).
CREATE POLICY "Owners manage org settings" ON public.org_settings
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Managers read org settings" ON public.org_settings
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

-- rental_inquiries: anyone may submit, staff may read/handle.
CREATE POLICY "Anyone can submit an inquiry" ON public.rental_inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new' AND handled_by IS NULL AND converted_lease_id IS NULL);
CREATE POLICY "Managers read inquiries" ON public.rental_inquiries
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Managers update inquiries" ON public.rental_inquiries
  FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Owners delete inquiries" ON public.rental_inquiries
  FOR DELETE TO authenticated USING (public.is_owner(auth.uid()));

-- Tenant read scopes.
CREATE POLICY "Tenants read own unit" ON public.units
  FOR SELECT TO authenticated USING (public.tenant_owns_unit(id));
CREATE POLICY "Tenants read own building" ON public.buildings
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.units u WHERE u.building_id = buildings.id AND public.tenant_owns_unit(u.id)));
CREATE POLICY "Tenants read own record" ON public.tenants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Tenants read own leases" ON public.leases
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "Tenants read own lease occupants" ON public.lease_occupants
  FOR SELECT TO authenticated USING (public.tenant_owns_lease(lease_id));
CREATE POLICY "Tenants read own meters" ON public.meters
  FOR SELECT TO authenticated USING (unit_id IS NOT NULL AND public.tenant_owns_unit(unit_id));
CREATE POLICY "Tenants read own readings" ON public.meter_readings
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.meters m WHERE m.id = meter_readings.meter_id
      AND m.unit_id IS NOT NULL AND public.tenant_owns_unit(m.unit_id)));
CREATE POLICY "Tenants submit readings" ON public.meter_readings
  FOR INSERT TO authenticated WITH CHECK (
    status = 'submitted' AND submitted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.meters m WHERE m.id = meter_readings.meter_id
      AND m.unit_id IS NOT NULL AND public.tenant_owns_unit(m.unit_id)));
CREATE POLICY "Tenants read own charges" ON public.charges
  FOR SELECT TO authenticated USING (public.tenant_owns_lease(lease_id));
CREATE POLICY "Tenants read own payments" ON public.payments
  FOR SELECT TO authenticated USING (public.tenant_owns_lease(lease_id));
CREATE POLICY "Tenants read own issues" ON public.issues
  FOR SELECT TO authenticated USING (public.tenant_owns_unit(unit_id));
CREATE POLICY "Tenants report issues" ON public.issues
  FOR INSERT TO authenticated WITH CHECK (
    reported_by = auth.uid() AND status = 'new' AND public.tenant_owns_unit(unit_id));
CREATE POLICY "Tenants update own new issues" ON public.issues
  FOR UPDATE TO authenticated
  USING (reported_by = auth.uid() AND status = 'new' AND public.tenant_owns_unit(unit_id))
  WITH CHECK (reported_by = auth.uid() AND status = 'new');
CREATE POLICY "Tenants read own issue comments" ON public.issue_comments
  FOR SELECT TO authenticated USING (is_internal = false AND EXISTS (
    SELECT 1 FROM public.issues i WHERE i.id = issue_comments.issue_id AND public.tenant_owns_unit(i.unit_id)));
CREATE POLICY "Tenants comment on own issues" ON public.issue_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND is_internal = false AND EXISTS (
      SELECT 1 FROM public.issues i WHERE i.id = issue_comments.issue_id AND public.tenant_owns_unit(i.unit_id)));
CREATE POLICY "Tenants read own documents" ON public.documents
  FOR SELECT TO authenticated USING (
    (tenant_id IS NOT NULL AND tenant_id = public.current_tenant_id())
    OR (lease_id IS NOT NULL AND public.tenant_owns_lease(lease_id))
    OR (unit_id IS NOT NULL AND public.tenant_owns_unit(unit_id)));

-- ============ 14. PUBLIC VACANCY VIEW (AGENTS.md 5.7) ============
CREATE VIEW public.public_vacancies
WITH (security_invoker = off) AS
SELECT u.id, u.name, u.unit_number, u.description, u.city, u.address,
       b.name AS building_name, u.area_m2, u.room_count, u.floor,
       u.monthly_rent, u.deposit, u.amenities, u.cover_image_url, u.image_urls,
       CASE WHEN u.status = 'vacant' THEN CURRENT_DATE ELSE l.end_date + 1 END AS available_from,
       (u.status = 'vacant') AS vacant_now
FROM public.units u
LEFT JOIN public.buildings b ON b.id = u.building_id
LEFT JOIN LATERAL (
  SELECT lx.end_date FROM public.leases lx
  WHERE lx.unit_id = u.id
    AND lx.status IN ('active','ending')
    AND lx.start_date <= CURRENT_DATE
    AND lx.end_date IS NOT NULL
    AND lx.end_date >= CURRENT_DATE
    AND lx.renewal = false
  ORDER BY lx.end_date
  LIMIT 1
) l ON true
WHERE u.is_active AND u.is_listed
  AND (u.status = 'vacant' OR (u.status = 'occupied' AND l.end_date IS NOT NULL))
  AND NOT EXISTS (
    SELECT 1 FROM public.leases f
    WHERE f.unit_id = u.id
      AND f.status IN ('draft','active','ending')
      AND f.start_date > CURRENT_DATE
  );
GRANT SELECT ON public.public_vacancies TO anon, authenticated;

-- ============ 15. STORAGE POLICIES ============
DROP POLICY IF EXISTS "Tenants read own meter photos" ON storage.objects;
CREATE POLICY "Managers manage documents bucket" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'documents' AND public.is_manager(auth.uid()));
CREATE POLICY "Tenants read own documents files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = 'tenant' AND (storage.foldername(name))[2] = public.current_tenant_id()::text
    OR ((storage.foldername(name))[1] = 'lease' AND public.tenant_owns_lease(((storage.foldername(name))[2])::uuid))
  ));

CREATE POLICY "Managers manage meter photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'meter-photos' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'meter-photos' AND public.is_manager(auth.uid()));
CREATE POLICY "Tenants read own meter photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'meter-photos' AND public.tenant_owns_unit(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Tenants upload meter photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meter-photos' AND public.tenant_owns_unit(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Managers manage issue photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'issue-photos' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'issue-photos' AND public.is_manager(auth.uid()));
CREATE POLICY "Tenants read own issue photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'issue-photos' AND public.tenant_owns_unit(((storage.foldername(name))[1])::uuid));
CREATE POLICY "Tenants upload issue photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-photos' AND public.tenant_owns_unit(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Public read unit photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'unit-photos');
CREATE POLICY "Managers manage unit photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'unit-photos' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'unit-photos' AND public.is_manager(auth.uid()));