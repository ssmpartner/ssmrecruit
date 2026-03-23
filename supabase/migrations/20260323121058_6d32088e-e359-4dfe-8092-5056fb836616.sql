
-- Email templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'lead_communication',
  placeholders text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read email_templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Superadmins can modify email_templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Email automation rules table
CREATE TABLE public.email_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'status_change',
  trigger_config jsonb NOT NULL DEFAULT '{}',
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_type text NOT NULL DEFAULT 'lead',
  is_active boolean NOT NULL DEFAULT true,
  delay_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read email_automation_rules"
  ON public.email_automation_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Superadmins can modify email_automation_rules"
  ON public.email_automation_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Seed default templates
INSERT INTO public.email_templates (name, subject, body, category, placeholders) VALUES
  ('Willkommen', 'Willkommen bei SSM Recruit, {{name}}!', E'Hallo {{name}},\n\nvielen Dank für Ihr Interesse! Wir freuen uns, Sie in unserem Recruiting-Prozess begrüssen zu dürfen.\n\nIhr nächster Schritt: Bitte füllen Sie das Insights-Formular aus, damit wir Sie besser kennenlernen können.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nFreundliche Grüsse\n{{recruiter_name}}', 'lead_communication', '{name,recruiter_name}'),
  ('Terminbestätigung', 'Ihr Termin am {{termin_datum}}', E'Hallo {{name}},\n\nIhr Termin wurde bestätigt:\n\n📅 Datum: {{termin_datum}}\n🕐 Uhrzeit: {{termin_zeit}}\n📍 Typ: {{termin_typ}}\n\nBitte seien Sie pünktlich. Bei Verhinderung informieren Sie uns bitte rechtzeitig.\n\nFreundliche Grüsse\n{{recruiter_name}}', 'lead_communication', '{name,termin_datum,termin_zeit,termin_typ,recruiter_name}'),
  ('Dokument-Erinnerung', 'Erinnerung: Bitte laden Sie Ihre Dokumente hoch', E'Hallo {{name}},\n\nwir erinnern Sie freundlich daran, Ihre Unterlagen (Lebenslauf, Zertifikate) über den folgenden Link hochzuladen:\n\n{{upload_link}}\n\nBitte reichen Sie die Dokumente innerhalb der nächsten 48 Stunden ein.\n\nFreundliche Grüsse\n{{recruiter_name}}', 'lead_communication', '{name,upload_link,recruiter_name}'),
  ('Insights-Erinnerung', 'Bitte füllen Sie das Insights-Formular aus', E'Hallo {{name}},\n\nSie haben Ihr Insights-Formular noch nicht ausgefüllt. Bitte nutzen Sie den folgenden Link:\n\n{{insights_link}}\n\nDas Ausfüllen dauert nur wenige Minuten und hilft uns, den richtigen Einsatzort für Sie zu finden.\n\nFreundliche Grüsse\n{{recruiter_name}}', 'lead_communication', '{name,insights_link,recruiter_name}'),
  ('Status-Update intern', 'Lead {{name}} – Status: {{neuer_status}}', E'Hallo {{recruiter_name}},\n\nder Lead {{name}} ({{email}}) hat den Status gewechselt:\n\n📊 Vorher: {{alter_status}}\n📊 Jetzt: {{neuer_status}}\n\nBitte prüfen Sie die nächsten Schritte.\n\nSSM Recruit System', 'internal', '{name,email,alter_status,neuer_status,recruiter_name}'),
  ('Aufgaben-Zuweisung', 'Neue Aufgabe: {{aufgabe_titel}}', E'Hallo {{recruiter_name}},\n\nIhnen wurde eine neue Aufgabe zugewiesen:\n\n📋 Titel: {{aufgabe_titel}}\n📅 Fällig bis: {{faellig_datum}}\n👤 Lead: {{lead_name}}\n\nBitte erledigen Sie diese zeitnah.\n\nSSM Recruit System', 'internal', '{recruiter_name,aufgabe_titel,faellig_datum,lead_name}'),
  ('Neuer Lead Benachrichtigung', 'Neuer Lead: {{name}}', E'Hallo {{recruiter_name}},\n\nein neuer Lead ist eingegangen:\n\n👤 Name: {{name}}\n📧 E-Mail: {{email}}\n📱 Telefon: {{phone}}\n📍 Standort: {{plz}} {{city}}\n🔗 Quelle: {{source}}\n\nBitte nehmen Sie zeitnah Kontakt auf.\n\nSSM Recruit System', 'notification', '{recruiter_name,name,email,phone,plz,city,source}');
