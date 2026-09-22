ALTER TABLE public.tasks DROP CONSTRAINT tasks_source_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_source_check CHECK (source = ANY (ARRAY['system','ai','manual']));