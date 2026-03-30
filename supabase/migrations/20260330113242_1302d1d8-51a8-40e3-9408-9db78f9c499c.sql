-- Allow anonymous users to read agency names for the public application wizard
CREATE POLICY "Anon can read agencies"
ON public.agencies
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read app_settings for wizard config
CREATE POLICY "Anon can read app_settings"
ON public.app_settings
FOR SELECT
TO anon
USING (true);