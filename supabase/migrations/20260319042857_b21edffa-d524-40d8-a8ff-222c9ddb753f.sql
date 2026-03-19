ALTER TABLE public.lead_sources ADD COLUMN color text NOT NULL DEFAULT '#6B7280';

UPDATE public.lead_sources SET color = '#22C55E' WHERE id = 'website';
UPDATE public.lead_sources SET color = '#3B82F6' WHERE id = 'meta';
UPDATE public.lead_sources SET color = '#8B5CF6' WHERE id = 'tiktok';
UPDATE public.lead_sources SET color = '#0A66C2' WHERE id = 'linkedin';
UPDATE public.lead_sources SET color = '#F59E0B' WHERE id = 'csv_import';
UPDATE public.lead_sources SET color = '#EC4899' WHERE id = 'weiter_empfehlung';
UPDATE public.lead_sources SET color = '#14B8A6' WHERE id = 'eigen_leads';