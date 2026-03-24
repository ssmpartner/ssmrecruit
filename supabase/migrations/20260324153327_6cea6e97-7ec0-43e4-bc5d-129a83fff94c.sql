
-- Fix leads where canton name is in city field
UPDATE leads SET canton = 'Thurgau', canton_code = 'TG', city = '' WHERE (canton = '' OR canton_code = '') AND city = 'Thurgau';
UPDATE leads SET canton = 'Basel-Landschaft', canton_code = 'BL', city = '' WHERE (canton = '' OR canton_code = '') AND city = 'Baselland';
UPDATE leads SET canton = 'Graubünden', canton_code = 'GR', city = '' WHERE (canton = '' OR canton_code = '') AND city IN ('Graubünden','Graubünde');
UPDATE leads SET canton = 'Wallis', canton_code = 'VS', city = '' WHERE (canton = '' OR canton_code = '') AND city IN ('Wallis','Valais');
UPDATE leads SET canton = 'Basel-Stadt', canton_code = 'BS', city = '' WHERE (canton = '' OR canton_code = '') AND city = 'Basel Stadt';
UPDATE leads SET canton = 'Bern', canton_code = 'BE', city = '' WHERE (canton = '' OR canton_code = '') AND city = 'Emmental';
UPDATE leads SET canton = 'St. Gallen', canton_code = 'SG', city = '' WHERE (canton = '' OR canton_code = '') AND city = 'Toggenburg';

-- Fix typos
UPDATE leads SET canton = 'Zürich', canton_code = 'ZH', city = 'Winterthur' WHERE (canton = '' OR canton_code = '') AND city = 'Winterhur';
UPDATE leads SET canton = 'Zürich', canton_code = 'ZH', city = 'Glattbrugg' WHERE (canton = '' OR canton_code = '') AND city = 'Glattbrug';

-- Known cities not in initial list
UPDATE leads SET canton = 'Zürich', canton_code = 'ZH' WHERE (canton = '' OR canton_code = '') AND city = 'Mettmenstetten';
UPDATE leads SET canton = 'Zürich', canton_code = 'ZH' WHERE (canton = '' OR canton_code = '') AND city = 'Wollerau';
UPDATE leads SET canton = 'Aargau', canton_code = 'AG' WHERE (canton = '' OR canton_code = '') AND city = 'Wohlenschwil';
UPDATE leads SET canton = 'Aargau', canton_code = 'AG' WHERE (canton = '' OR canton_code = '') AND city = 'Kaiseraugst';
UPDATE leads SET canton = 'Aargau', canton_code = 'AG' WHERE (canton = '' OR canton_code = '') AND city = 'Aarburg';
UPDATE leads SET canton = 'Bern', canton_code = 'BE' WHERE (canton = '' OR canton_code = '') AND city = 'Reinach-Langenthal';

-- PLZ-based for remaining 4-digit Swiss PLZ
UPDATE leads SET canton = 'Basel-Landschaft', canton_code = 'BL' WHERE (canton = '' OR canton_code = '') AND plz ~ '^\d{4}$' AND plz::int BETWEEN 4200 AND 4399;
