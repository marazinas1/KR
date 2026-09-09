-- Booking-era digital signing table: empty, unreferenced by app code, replaced by
-- paper signing (the signed scan is uploaded as a normal private document).
DROP TABLE IF EXISTS public.signed_contracts CASCADE;

-- Template kinds were unconstrained free text; step 9 adds 'lease'.
ALTER TABLE public.contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_kind_check;
ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_kind_check
  CHECK (kind IN ('rental', 'privacy', 'lease'));