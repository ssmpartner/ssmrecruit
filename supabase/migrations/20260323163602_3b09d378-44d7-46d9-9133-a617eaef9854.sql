
CREATE TABLE public.wizards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'recruiting',
  status text NOT NULL DEFAULT 'inactive',
  version text NOT NULL DEFAULT '1.0',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wizards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read wizards"
  ON public.wizards FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Superadmins can modify wizards"
  ON public.wizards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_wizards_updated_at
  BEFORE UPDATE ON public.wizards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
