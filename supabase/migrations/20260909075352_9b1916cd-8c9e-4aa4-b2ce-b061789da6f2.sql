ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT 'Ilgalaikė nuoma';

UPDATE public.org_settings
SET tagline = 'Ilgalaikė butų nuoma'
WHERE singleton = true;

COMMENT ON COLUMN public.org_settings.tagline IS 'Short line shown under the display name in the text brand mark (admin, auth, public header) when brand_logo_url is not set. Editable in Settings; neutral default for new deployments.';