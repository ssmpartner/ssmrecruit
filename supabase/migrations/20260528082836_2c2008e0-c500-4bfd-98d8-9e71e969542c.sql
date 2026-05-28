-- Add can_receive_leads flag to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS can_receive_leads boolean NOT NULL DEFAULT true;