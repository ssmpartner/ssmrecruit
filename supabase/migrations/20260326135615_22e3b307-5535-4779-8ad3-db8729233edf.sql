-- Add 3 new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controlling';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'geschaeftsleitung';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';