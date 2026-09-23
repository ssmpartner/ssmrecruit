ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS manager_employee_id text REFERENCES public.employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agencies_manager_employee_id ON public.agencies(manager_employee_id);
COMMENT ON COLUMN public.agencies.manager_employee_id IS 'Zustaendiger Agenturleiter (Mitarbeiter). Ein Mitarbeiter kann mehreren Agenturen zugewiesen sein.';