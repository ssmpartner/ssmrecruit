
-- Add user_id column to employees table
ALTER TABLE public.employees
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- Link existing employees to users by matching email
UPDATE public.employees e
SET user_id = u.id
FROM auth.users u
WHERE LOWER(e.email) = LOWER(u.email);
