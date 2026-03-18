-- Create role enum
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'backoffice', 'analyst');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: authenticated users can read all roles
CREATE POLICY "Authenticated can read roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- RLS: only superadmins can insert roles
CREATE POLICY "Superadmins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- RLS: only superadmins can update roles
CREATE POLICY "Superadmins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- RLS: only superadmins can delete roles
CREATE POLICY "Superadmins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- Also let superadmins read all profiles (not just their own)
CREATE POLICY "Superadmins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- Insert Bilel as superadmin
INSERT INTO public.user_roles (user_id, role)
VALUES ('581235fe-5abc-4596-a8ec-21e89b1526b6', 'superadmin');