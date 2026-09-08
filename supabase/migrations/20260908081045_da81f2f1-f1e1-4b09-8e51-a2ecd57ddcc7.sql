DROP POLICY IF EXISTS "Anyone can view active properties" ON public.units;
DROP POLICY IF EXISTS "Anyone views active cars" ON public.units;
REVOKE SELECT ON public.units FROM anon;