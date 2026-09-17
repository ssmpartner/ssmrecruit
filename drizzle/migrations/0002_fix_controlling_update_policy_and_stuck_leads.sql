-- 1) Controlling darf bei Sonderfreigaben auch direkt auf hr_processing setzen
DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;

CREATE POLICY "Leads update scoped by role" ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR (
    (is_demo = false) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND agency_id = get_current_employee_agency())
      OR (has_role(auth.uid(), 'controlling'::app_role) AND status = 'ready_for_controlling'::text)
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status = ANY (ARRAY['controlling_approved','management_review']))
      OR (has_role(auth.uid(), 'hr'::app_role) AND status = ANY (ARRAY['management_approved','hr_processing','hr_pending','hired']))
      OR (employee_id = get_current_employee_id())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role) OR (
    (is_demo = false) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND agency_id = get_current_employee_agency())
      OR (has_role(auth.uid(), 'controlling'::app_role) AND status = ANY (ARRAY['ready_for_controlling','controlling_approved','management_review','hr_processing','rejected']))
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status = ANY (ARRAY['management_review','management_approved','hr_processing','rejected']))
      OR (has_role(auth.uid(), 'hr'::app_role) AND status = ANY (ARRAY['hr_processing','hr_pending','hired','rejected']))
      OR (employee_id = get_current_employee_id())
    )
  )
);

-- 2) Hängige, vom Controlling bereits freigegebene Sonderfälle nachziehen
UPDATE public.leads
SET status = 'hr_processing', controlling_direct_to_hr = false, controlling_query_open = false, updated_at = now()
WHERE id IN ('l1786448154798-w27n','l1787928397865-v11p','l1787922396937-wd9p')
  AND status = 'ready_for_controlling';