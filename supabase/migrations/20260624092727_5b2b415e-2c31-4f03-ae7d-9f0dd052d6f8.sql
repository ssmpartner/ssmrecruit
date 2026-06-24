
CREATE TABLE public.welcome_wizard_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT false,
  video_url text,
  thumbnail_url text,
  page_title text NOT NULL DEFAULT 'Herzlich willkommen!',
  page_intro text NOT NULL DEFAULT 'Schön, dass Sie sich für uns interessieren. Schauen Sie sich kurz unser Willkommen-Video an und entscheiden Sie, wie es weitergehen soll.',
  button_proceed_label text NOT NULL DEFAULT 'Nächste Schritte',
  button_reject_label text NOT NULL DEFAULT 'Nicht interessiert',
  proceed_confirmation_text text NOT NULL DEFAULT 'Super! Sie werden jetzt zum Insights-Test weitergeleitet.',
  reject_confirmation_text text NOT NULL DEFAULT 'Vielen Dank für Ihre Rückmeldung. Wir wünschen Ihnen alles Gute.',
  email_subject text NOT NULL DEFAULT 'Willkommen bei SSM Partner – {{name}}',
  email_html text NOT NULL DEFAULT '<p>Hallo {{name}},</p><p>vielen Dank für Ihr Interesse. Klicken Sie auf den Button, um unser kurzes Willkommen-Video anzusehen und die nächsten Schritte zu wählen.</p><p><a href="{{cta_url}}" style="background:#324642;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Willkommen-Video ansehen</a></p>',
  auto_sources text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.welcome_wizard_config TO authenticated;
GRANT ALL ON public.welcome_wizard_config TO service_role;

ALTER TABLE public.welcome_wizard_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read welcome config"
  ON public.welcome_wizard_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage welcome config"
  ON public.welcome_wizard_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.welcome_wizard_config (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.welcome_lead_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  action text CHECK (action IN ('reject','proceed')),
  insights_request_id uuid
);

CREATE INDEX idx_welcome_lead_tokens_lead ON public.welcome_lead_tokens(lead_id);

GRANT ALL ON public.welcome_lead_tokens TO service_role;

ALTER TABLE public.welcome_lead_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read welcome tokens"
  ON public.welcome_lead_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for welcome-assets bucket
CREATE POLICY "Auth users read welcome assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'welcome-assets');

CREATE POLICY "Admins upload welcome assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'welcome-assets'
    AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins update welcome assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'welcome-assets'
    AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins delete welcome assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'welcome-assets'
    AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  );

-- Trigger: send welcome email on lead insert
CREATE OR REPLACE FUNCTION public.trg_send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _url text := 'https://adettewqzanmkgnnjlop.supabase.co/functions/v1/send-welcome-email';
BEGIN
  IF NEW.id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF _key IS NULL THEN
    RAISE WARNING 'trg_send_welcome_email: service role key missing';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object('lead_id', NEW.id, 'auto', true)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_send_welcome_email failed: %', sqlerrm;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_send_welcome_email ON public.leads;
CREATE TRIGGER leads_send_welcome_email
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_send_welcome_email();

CREATE TRIGGER trg_welcome_wizard_config_updated_at
  BEFORE UPDATE ON public.welcome_wizard_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
