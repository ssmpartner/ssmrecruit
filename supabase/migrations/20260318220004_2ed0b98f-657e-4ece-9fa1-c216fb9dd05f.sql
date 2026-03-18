ALTER TABLE public.agencies 
  ADD COLUMN region text NOT NULL DEFAULT '',
  ADD COLUMN language text NOT NULL DEFAULT 'de',
  ADD COLUMN allowed_cantons text[] NOT NULL DEFAULT '{}'::text[];