CREATE POLICY "Superadmin can delete wizard results"
ON public.status_wizard_results
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));