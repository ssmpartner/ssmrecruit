-- Allow anonymous users to read active wizards (for public application wizard)
CREATE POLICY "Anon can read active wizards"
ON public.wizards
FOR SELECT
TO anon
USING (status = 'active');