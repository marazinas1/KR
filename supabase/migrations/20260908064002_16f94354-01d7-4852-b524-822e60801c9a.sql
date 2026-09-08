-- 0. Preflight guard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role::text IN ('housekeeper','user')) THEN
    RAISE EXCEPTION 'Legacy housekeeper/user role assignments exist; review manually before migrating.';
  END IF;
END $$;

-- 1. Drop dependent policies
DROP POLICY IF EXISTS "Admins can view notification log" ON public.booking_notifications;
DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins manage car_investments" ON public.car_investments;
DROP POLICY IF EXISTS "Admins manage car_maintenance" ON public.car_maintenance;
DROP POLICY IF EXISTS "Admins manage cars" ON public.cars;
DROP POLICY IF EXISTS "Admins view all cars" ON public.cars;
DROP POLICY IF EXISTS "Admins manage content templates" ON public.content_templates;
DROP POLICY IF EXISTS "Admins manage content_translations" ON public.content_translations;
DROP POLICY IF EXISTS "Admins manage contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admins manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins manage housekeeping_comments" ON public.housekeeping_comments;
DROP POLICY IF EXISTS "Admins manage housekeeping_tasks" ON public.housekeeping_tasks;
DROP POLICY IF EXISTS "Admins read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins read page_views" ON public.page_views;
DROP POLICY IF EXISTS "Admins can view payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins manage properties" ON public.properties;
DROP POLICY IF EXISTS "Admins view all cars" ON public.properties;
DROP POLICY IF EXISTS "Admins manage car documents" ON public.property_documents;
DROP POLICY IF EXISTS "Admins manage service events" ON public.property_events;
DROP POLICY IF EXISTS "Admins manage car_investments" ON public.property_investments;
DROP POLICY IF EXISTS "Admins manage car_maintenance" ON public.property_maintenance;
DROP POLICY IF EXISTS "Admins can delete property settings" ON public.property_settings;
DROP POLICY IF EXISTS "Admins can insert property settings" ON public.property_settings;
DROP POLICY IF EXISTS "Admins can update property settings" ON public.property_settings;
DROP POLICY IF EXISTS "Admins can view property settings" ON public.property_settings;
DROP POLICY IF EXISTS "Admins manage room_status" ON public.room_status;
DROP POLICY IF EXISTS "Admins manage signed contracts" ON public.signed_contracts;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;

-- 1b. Drop dependent storage policies
DROP POLICY IF EXISTS "Admins delete car-documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete car-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins read car-documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins update car-documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins update car-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins write car-documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins write car-images" ON storage.objects;
DROP POLICY IF EXISTS "car_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "car_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "car_images_admin_update" ON storage.objects;

-- 2. Drop enum-dependent functions and trigger
DROP TRIGGER IF EXISTS guard_user_roles_changes ON public.user_roles;
DROP FUNCTION IF EXISTS public.guard_user_roles();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_developer(uuid);
DROP FUNCTION IF EXISTS public.is_owner(uuid);
DROP FUNCTION IF EXISTS public.analytics_summary(date, date);
DROP FUNCTION IF EXISTS public.admin_get_door_code(uuid);

-- 3. Replace the enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
DROP TYPE public.app_role;
CREATE TYPE public.app_role AS ENUM ('developer','owner','manager','tenant');
UPDATE public.user_roles SET role = 'manager' WHERE role IN ('admin','administrator');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 4. Recreate role helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND CASE _role
        WHEN 'developer' THEN ur.role = 'developer'
        WHEN 'owner'     THEN ur.role IN ('developer','owner')
        WHEN 'manager'   THEN ur.role IN ('developer','owner','manager')
        WHEN 'tenant'    THEN ur.role = 'tenant'
      END
  )
$$;

CREATE OR REPLACE FUNCTION public.is_developer(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'developer'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'owner'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'manager'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_tenant(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'tenant'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_developer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_developer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant(uuid) TO authenticated, service_role;

-- 5. Recreate analytics + door code with new levels
CREATE OR REPLACE FUNCTION public.admin_get_door_code(_property_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_manager(auth.uid()) THEN p.door_code END
  FROM public.properties p WHERE p.id = _property_id
$$;

CREATE OR REPLACE FUNCTION public.analytics_summary(_from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  IF _from IS NULL OR _to IS NULL OR _to < _from OR (_to - _from) > 400 THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;

  WITH pv AS (
    SELECT
      (created_at AT TIME ZONE 'utc')::date AS day,
      path,
      session_id,
      CASE
        WHEN coalesce(referrer, '') = '' THEN 'direct'
        WHEN referrer ILIKE '%google.%' THEN 'google'
        WHEN referrer ILIKE '%bing.%' OR referrer ILIKE '%duckduckgo.%' OR referrer ILIKE '%yahoo.%' THEN 'search'
        WHEN referrer ILIKE '%facebook.%' OR referrer ILIKE '%fb.%' THEN 'facebook'
        WHEN referrer ILIKE '%instagram.%' THEN 'instagram'
        ELSE 'other'
      END AS source,
      CASE
        WHEN user_agent ILIKE '%ipad%' OR user_agent ILIKE '%tablet%' THEN 'tablet'
        WHEN user_agent ILIKE '%mobi%' OR user_agent ILIKE '%iphone%' OR user_agent ILIKE '%android%' THEN 'mobile'
        WHEN coalesce(user_agent, '') = '' THEN 'unknown'
        ELSE 'desktop'
      END AS device
    FROM public.page_views
    WHERE (created_at AT TIME ZONE 'utc')::date BETWEEN _from AND _to
  )
  SELECT jsonb_build_object(
    'totals', (SELECT jsonb_build_object('views', count(*), 'visitors', count(DISTINCT session_id)) FROM pv),
    'previous', (
      SELECT jsonb_build_object('views', count(*), 'visitors', count(DISTINCT session_id))
      FROM public.page_views
      WHERE (created_at AT TIME ZONE 'utc')::date BETWEEN (_from - (_to - _from) - 1) AND (_from - 1)
    ),
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.day)
      FROM (SELECT day, count(*) AS views, count(DISTINCT session_id) AS visitors FROM pv GROUP BY day) d
    ), '[]'::jsonb),
    'top_pages', COALESCE((
      SELECT jsonb_agg(row_to_json(p))
      FROM (SELECT path, count(*) AS views FROM pv GROUP BY path ORDER BY count(*) DESC LIMIT 15) p
    ), '[]'::jsonb),
    'sources', COALESCE((
      SELECT jsonb_agg(row_to_json(s))
      FROM (SELECT source, count(*) AS views FROM pv GROUP BY source ORDER BY count(*) DESC) s
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(row_to_json(v))
      FROM (SELECT device, count(*) AS views FROM pv GROUP BY device) v
    ), '[]'::jsonb),
    'leads', (
      SELECT count(*) FROM public.bookings
      WHERE (created_at AT TIME ZONE 'utc')::date BETWEEN _from AND _to
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- 6. Role guard trigger
CREATE OR REPLACE FUNCTION public.guard_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  service boolean := coalesce(auth.role(), '') = 'service_role';
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'developer'
     AND NOT public.is_developer(auth.uid()) AND NOT service THEN
    RAISE EXCEPTION 'Developer accounts cannot be modified.';
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'developer'
     AND NOT public.is_developer(auth.uid()) AND NOT service THEN
    RAISE EXCEPTION 'The developer role cannot be granted.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_user_roles_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles();

-- 7. Operational policies: manager and above (delete owner-only)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings','car_investments','car_maintenance','cars','expenses',
    'housekeeping_comments','housekeeping_tasks','properties','property_documents',
    'property_events','property_investments','property_maintenance','room_status','signed_contracts'
  ] LOOP
    EXECUTE format('CREATE POLICY "Managers read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Managers insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Managers update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Owners delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_owner(auth.uid()))', t);
  END LOOP;
END $$;

-- Read-only operational tables
CREATE POLICY "Managers read booking_notifications" ON public.booking_notifications
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Managers read invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Managers read payment_transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

-- 8. Owner-only configuration and oversight
CREATE POLICY "Owners manage content_templates" ON public.content_templates
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners manage content_translations" ON public.content_translations
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners manage contract_templates" ON public.contract_templates
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners read page_views" ON public.page_views
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners read property_settings" ON public.property_settings
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));
CREATE POLICY "Owners insert property_settings" ON public.property_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners update property_settings" ON public.property_settings
  FOR UPDATE TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners delete property_settings" ON public.property_settings
  FOR DELETE TO authenticated USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners read user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_owner(auth.uid()));
CREATE POLICY "Owners insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners update user_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_owner(auth.uid()));

-- 9. Recreate storage policies on the new hierarchy
CREATE POLICY "Managers read car-documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'car-documents' AND public.is_manager(auth.uid()));
CREATE POLICY "Managers write car-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'car-documents' AND public.is_manager(auth.uid()));
CREATE POLICY "Managers update car-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'car-documents' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'car-documents' AND public.is_manager(auth.uid()));
CREATE POLICY "Owners delete car-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'car-documents' AND public.is_owner(auth.uid()));
CREATE POLICY "Managers write car-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'car-images' AND public.is_manager(auth.uid()));
CREATE POLICY "Managers update car-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'car-images' AND public.is_manager(auth.uid()))
  WITH CHECK (bucket_id = 'car-images' AND public.is_manager(auth.uid()));
CREATE POLICY "Owners delete car-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'car-images' AND public.is_owner(auth.uid()));
