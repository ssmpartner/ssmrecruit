
-- Goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  agency_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  category TEXT NOT NULL DEFAULT 'custom',
  quarter TEXT NOT NULL DEFAULT '',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read goals" ON public.goals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage goals" ON public.goals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Goal progress table
CREATE TABLE public.goal_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  recorded_by UUID,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read goal_progress" ON public.goal_progress
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage goal_progress" ON public.goal_progress
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own progress" ON public.goal_progress
  FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());

-- Indexes
CREATE INDEX idx_goals_employee ON public.goals(employee_id);
CREATE INDEX idx_goals_agency ON public.goals(agency_id);
CREATE INDEX idx_goal_progress_goal ON public.goal_progress(goal_id);

-- Trigger for updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
