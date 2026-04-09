CREATE TABLE public.process_flow_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Neuer Entwurf',
  description TEXT NOT NULL DEFAULT '',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_test_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.process_flow_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read process_flow_drafts"
ON public.process_flow_drafts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmins can modify process_flow_drafts"
ON public.process_flow_drafts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_process_flow_drafts_updated_at
BEFORE UPDATE ON public.process_flow_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();