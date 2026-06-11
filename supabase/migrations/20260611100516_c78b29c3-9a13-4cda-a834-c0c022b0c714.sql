ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS disc_scores_adapted jsonb,
  ADD COLUMN IF NOT EXISTS driving_forces_scores jsonb,
  ADD COLUMN IF NOT EXISTS behavioral_hierarchy jsonb,
  ADD COLUMN IF NOT EXISTS norm_reference jsonb;