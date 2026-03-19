
CREATE TABLE public.lead_sources (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Globe',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lead_sources" ON public.lead_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can modify lead_sources" ON public.lead_sources
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.lead_sources (id, label, icon, sort_order) VALUES
  ('website', 'Webseite', 'Globe', 1),
  ('tiktok', 'TikTok', 'Music', 2),
  ('meta', 'Meta Ads', 'Facebook', 3),
  ('linkedin', 'LinkedIn', 'Linkedin', 4),
  ('csv_import', 'CSV Import', 'FileSpreadsheet', 5);
