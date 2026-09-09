-- Managers print lease contracts from templates, so they must be able to read
-- them. Editing/creating templates stays owner-only (existing FOR ALL policy).
CREATE POLICY "Managers read contract templates" ON public.contract_templates
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));