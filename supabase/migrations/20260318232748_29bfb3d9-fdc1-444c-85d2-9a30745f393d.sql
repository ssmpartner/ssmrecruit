
CREATE TABLE public.integrations (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  method text NOT NULL DEFAULT 'none',
  zapier_webhook text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  connected boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read integrations" ON public.integrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins can modify integrations" ON public.integrations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Seed default integrations
INSERT INTO public.integrations (id, name, description, icon) VALUES
  ('meta', 'Meta (Facebook / Instagram)', 'Leads aus Facebook & Instagram Lead Ads sammeln', '📘'),
  ('tiktok', 'TikTok Ads', 'Leads aus TikTok Lead-Generierungskampagnen sammeln', '🎵'),
  ('linkedin', 'LinkedIn Lead Forms', 'Leads aus LinkedIn Lead Gen Forms sammeln (demnächst)', '💼'),
  ('website', 'Webseiten-Formulare', 'Leads aus Ihren Website-Kontaktformularen per Webhook sammeln', '🌐');
