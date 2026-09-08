REVOKE EXECUTE ON FUNCTION public.issue_invoice_for_charges(uuid[], date, text, numeric, boolean, jsonb, jsonb, jsonb, numeric, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_invoice_for_charges(uuid[], date, text, numeric, boolean, jsonb, jsonb, jsonb, numeric, numeric, numeric, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.claim_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invoice_number() TO authenticated, service_role;