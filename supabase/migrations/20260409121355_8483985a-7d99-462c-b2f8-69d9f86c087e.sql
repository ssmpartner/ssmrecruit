
ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS personality_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS personality_avatar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS personality_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS personality_meaning text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS personality_strengths_extended jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS personality_risks_extended jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS personality_type_combination text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS top_motivators jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dominant_disc_type text NOT NULL DEFAULT '';
