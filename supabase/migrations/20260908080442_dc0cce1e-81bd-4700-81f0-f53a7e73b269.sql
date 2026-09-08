ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_key;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS booking_id;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_lease_id_idx ON public.invoices (lease_id);
CREATE INDEX IF NOT EXISTS invoices_issue_date_idx ON public.invoices (issue_date DESC);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;