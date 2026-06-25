
DELETE FROM public.contract_set_versions WHERE set_id IN (SELECT id FROM public.contract_sets WHERE code = '__test_set__');
DELETE FROM public.contract_audit_log WHERE entity_id IN (SELECT id::text FROM public.contract_sets WHERE code = '__test_set__');
DELETE FROM public.contract_sets WHERE code = '__test_set__';
