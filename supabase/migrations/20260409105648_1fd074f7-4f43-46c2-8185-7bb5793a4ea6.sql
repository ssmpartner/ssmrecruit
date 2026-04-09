CREATE TABLE public.career_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position TEXT NOT NULL,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read career_plans"
ON public.career_plans FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Superadmins can modify career_plans"
ON public.career_plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_career_plans_updated_at
BEFORE UPDATE ON public.career_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();