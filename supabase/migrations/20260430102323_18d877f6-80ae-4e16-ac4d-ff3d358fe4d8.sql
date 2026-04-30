-- Feedback table
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'improvement',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'submitted',
  created_by_user_id uuid NOT NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_by_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read feedback"
ON public.feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create feedback"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Owner can update own feedback"
ON public.feedback FOR UPDATE TO authenticated
USING (auth.uid() = created_by_user_id)
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Superadmin can update any feedback"
ON public.feedback FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Owner or superadmin can delete feedback"
ON public.feedback FOR DELETE TO authenticated
USING (auth.uid() = created_by_user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

-- Feedback comments
CREATE TABLE public.feedback_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  comment text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  created_by_user_id uuid NOT NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read feedback_comments"
ON public.feedback_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create feedback_comments"
ON public.feedback_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Owner or superadmin can delete feedback_comments"
ON public.feedback_comments FOR DELETE TO authenticated
USING (auth.uid() = created_by_user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_feedback_comments_feedback_id ON public.feedback_comments(feedback_id);