-- Exact decimal rounding for billing: round(a * b / div, 2) in numeric, never in JS floats.
CREATE OR REPLACE FUNCTION public.round_money_products(_items jsonb)
RETURNS numeric[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    array_agg(
      round(((i->>'a')::numeric * (i->>'b')::numeric) / coalesce(nullif(i->>'div','')::numeric, 1), 2)
      ORDER BY ord
    ),
    '{}'::numeric[]
  )
  FROM jsonb_array_elements(coalesce(_items, '[]'::jsonb)) WITH ORDINALITY AS t(i, ord)
$$;
COMMENT ON FUNCTION public.round_money_products(jsonb) IS
  'Billing rounding authority: each item {a,b,div?} -> round(a*b/div, 2) computed in numeric (half away from zero). charges.server.ts sends raw DB strings so no float conversion happens before rounding.';
REVOKE EXECUTE ON FUNCTION public.round_money_products(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.round_money_products(jsonb) TO authenticated, service_role;

-- Booking-era SECURITY DEFINER functions: no anonymous execution.
REVOKE EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.analytics_summary(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_room_status_for_property() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_template() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_user_roles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_api_clients_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_booking_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_meter_reading() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_summary(date, date) TO authenticated, service_role;