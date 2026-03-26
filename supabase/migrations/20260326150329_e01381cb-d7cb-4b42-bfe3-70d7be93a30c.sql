ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_approver_user_id uuid DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_approver_role text NOT NULL DEFAULT '';