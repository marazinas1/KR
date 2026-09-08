CREATE OR REPLACE FUNCTION public.issue_invoice_for_charges(_charge_ids uuid[], _issue_date date, _currency text, _vat_rate numeric, _is_vat_invoice boolean, _seller jsonb, _buyer jsonb, _line_items jsonb, _subtotal_net numeric, _vat_amount numeric, _total numeric, _notes text, _issued_by text)
 RETURNS TABLE(invoice_id uuid, full_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_lease uuid;
  v_lease_count int;
  v_locked int;
  v_invoiced int;
  v_series text;
  v_number integer;
  v_full text;
  v_invoice uuid;
  v_updated int;
  v_expected int;
BEGIN
  IF NOT public.is_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_expected := COALESCE(array_length(_charge_ids, 1), 0);
  IF v_expected = 0 THEN
    RAISE EXCEPTION 'No charges selected';
  END IF;

  -- 1. lock the rows
  SELECT count(*), count(DISTINCT c.lease_id), count(*) FILTER (WHERE c.invoice_id IS NOT NULL), min(c.lease_id)
    INTO v_locked, v_lease_count, v_invoiced, v_lease
  FROM (SELECT ch.id, ch.lease_id, ch.invoice_id FROM public.charges ch WHERE ch.id = ANY(_charge_ids) FOR UPDATE) c;

  -- 2. validate
  IF v_locked <> v_expected THEN
    RAISE EXCEPTION 'Charge not found (% of % rows)', v_locked, v_expected;
  END IF;
  IF v_lease_count <> 1 THEN
    RAISE EXCEPTION 'Charges belong to % leases; one invoice covers one lease', v_lease_count;
  END IF;
  IF v_invoiced > 0 THEN
    RAISE EXCEPTION 'ChargeAlreadyInvoiced: % charge(s) already on an invoice', v_invoiced;
  END IF;

  -- 3. number from the existing series
  SELECT cin.series, cin.number INTO v_series, v_number FROM public.claim_invoice_number() cin;
  v_full := CASE WHEN COALESCE(v_series, '') <> '' THEN v_series || '-' || v_number ELSE v_number::text END;

  -- 4. invoice row
  INSERT INTO public.invoices (
    lease_id, invoice_series, invoice_number, full_number, issue_date, currency,
    vat_rate, is_vat_invoice, seller, buyer, line_items, subtotal_net, vat_amount, total, notes, issued_by
  ) VALUES (
    v_lease, COALESCE(v_series, ''), v_number, v_full, _issue_date, _currency,
    _vat_rate, _is_vat_invoice, _seller, _buyer, _line_items, _subtotal_net, _vat_amount, _total,
    COALESCE(_notes, ''), COALESCE(_issued_by, '')
  ) RETURNING id INTO v_invoice;

  -- 5. link charges (table-qualified: the OUT column is also named invoice_id)
  UPDATE public.charges ch SET invoice_id = v_invoice
  WHERE ch.id = ANY(_charge_ids) AND ch.invoice_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- 6. assert — any failure here rolls back the invoice row and the number claim
  IF v_updated <> v_expected THEN
    RAISE EXCEPTION 'Linked % of % charges — rolled back', v_updated, v_expected;
  END IF;

  RETURN QUERY SELECT v_invoice, v_full;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.issue_invoice_for_charges(uuid[], date, text, numeric, boolean, jsonb, jsonb, jsonb, numeric, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_invoice_for_charges(uuid[], date, text, numeric, boolean, jsonb, jsonb, jsonb, numeric, numeric, numeric, text, text) TO authenticated, service_role;