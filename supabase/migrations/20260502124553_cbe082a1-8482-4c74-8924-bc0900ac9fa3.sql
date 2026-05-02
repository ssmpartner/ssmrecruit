CREATE POLICY "Anon can insert disc_results"
  ON public.disc_results FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read disc_results"
  ON public.disc_results FOR SELECT TO anon
  USING (true);