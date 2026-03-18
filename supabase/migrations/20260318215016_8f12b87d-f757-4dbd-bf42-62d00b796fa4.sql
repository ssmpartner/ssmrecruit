
-- =====================================================
-- RECRUITFLOW FULL DATABASE SCHEMA
-- =====================================================

-- 1. AGENCIES
CREATE TABLE public.agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to agencies" ON public.agencies FOR ALL USING (true) WITH CHECK (true);

-- 2. EMPLOYEES
CREATE TABLE public.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'agency_manager', 'employee')),
  agency_id TEXT NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- 3. LEADS
CREATE TABLE public.leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  plz TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  canton TEXT NOT NULL DEFAULT '',
  canton_code TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'tiktok', 'meta', 'linkedin', 'csv_import')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'appointment', 'interview_1', 'insights', 'interview_2', 'hired', 'rejected')),
  agency_id TEXT NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_agency ON public.leads(agency_id);
CREATE INDEX idx_leads_employee ON public.leads(employee_id);
CREATE INDEX idx_leads_canton ON public.leads(canton_code);

-- 4. APPOINTMENTS
CREATE TABLE public.appointments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('phone', 'video', 'onsite')),
  meeting_link TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);

-- 5. ACTIVITIES
CREATE TABLE public.activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'assignment', 'edit', 'note', 'appointment')),
  description TEXT NOT NULL DEFAULT '',
  "user" TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_activities_lead ON public.activities(lead_id);

-- 6. DISC RESULTS
CREATE TABLE public.disc_results (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}',
  dominant_type TEXT NOT NULL CHECK (dominant_type IN ('D', 'I', 'S', 'C')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers JSONB NOT NULL DEFAULT '[]'
);
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to disc_results" ON public.disc_results FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_disc_lead ON public.disc_results(lead_id);

-- 7. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lead_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 8. APP SETTINGS (key-value store)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
