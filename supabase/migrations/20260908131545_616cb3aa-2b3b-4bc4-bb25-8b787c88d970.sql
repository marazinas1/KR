CREATE POLICY "Tenants read invoices of own lease"
ON public.invoices FOR SELECT TO authenticated
USING (lease_id IS NOT NULL AND public.tenant_owns_lease(lease_id));