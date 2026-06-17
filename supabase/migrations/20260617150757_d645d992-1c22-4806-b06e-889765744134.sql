
CREATE TABLE public.news_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  variant text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_banners TO authenticated;
GRANT ALL ON public.news_banners TO service_role;

ALTER TABLE public.news_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active banners"
  ON public.news_banners FOR SELECT
  TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Superadmins can read all banners"
  ON public.news_banners FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can insert banners"
  ON public.news_banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update banners"
  ON public.news_banners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete banners"
  ON public.news_banners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_news_banners_updated_at
  BEFORE UPDATE ON public.news_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
