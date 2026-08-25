CREATE TABLE IF NOT EXISTS public.contract_counters (
  year integer PRIMARY KEY,
  last_no integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.contract_counters TO service_role;
ALTER TABLE public.contract_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_number text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS employee_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS contracts_contract_number_key ON public.contracts (contract_number) WHERE contract_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS contracts_employee_id_idx ON public.contracts (employee_id) WHERE employee_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y integer := extract(year from now())::integer;
  n integer;
BEGIN
  IF NEW.contract_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.contract_counters (year, last_no) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_no = contract_counters.last_no + 1
  RETURNING last_no INTO n;
  NEW.contract_number := 'SSM-' || y || '-' || lpad(n::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_number ON public.contracts;
CREATE TRIGGER trg_contract_number
BEFORE INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.assign_contract_number();