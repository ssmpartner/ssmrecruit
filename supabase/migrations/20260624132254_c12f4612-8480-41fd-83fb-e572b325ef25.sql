ALTER TABLE public.welcome_wizard_config
  ADD COLUMN IF NOT EXISTS video_url_appointments text,
  ADD COLUMN IF NOT EXISTS thumbnail_url_appointments text,
  ADD COLUMN IF NOT EXISTS appointments_video_title text DEFAULT 'Während Sie Termine vorschlagen…',
  ADD COLUMN IF NOT EXISTS appointments_video_intro text DEFAULT 'Schauen Sie sich dieses kurze Video an, während Sie passende Termine eintragen.';