-- ============================================================
-- GEOGRAPHY SEED — Maharashtra
-- Districts: Chhatrapati Sambhajinagar · Ahilyanagar · Pune · Nashik
-- Hierarchy: State → District → Taluka → Village (with pin_code)
-- Created: 2026-06-07
-- NOTE: Run once. Villages have no unique constraint — re-running
--       creates duplicates. To re-seed: TRUNCATE villages, talukas,
--       districts (in that order) first.
-- ============================================================

SET NAMES utf8mb4;

-- ─── STATE ────────────────────────────────────────────────────
INSERT IGNORE INTO states (name, code) VALUES ('Maharashtra', 'MH');
SET @mh = (SELECT id FROM states WHERE code = 'MH');


-- ─── DISTRICTS ────────────────────────────────────────────────
INSERT IGNORE INTO districts (state_id, name) VALUES
  (@mh, 'Chhatrapati Sambhajinagar'),
  (@mh, 'Ahilyanagar'),
  (@mh, 'Pune'),
  (@mh, 'Nashik');

SET @d_csn    = (SELECT id FROM districts WHERE state_id = @mh AND name = 'Chhatrapati Sambhajinagar');
SET @d_ahn    = (SELECT id FROM districts WHERE state_id = @mh AND name = 'Ahilyanagar');
SET @d_pune   = (SELECT id FROM districts WHERE state_id = @mh AND name = 'Pune');
SET @d_nashik = (SELECT id FROM districts WHERE state_id = @mh AND name = 'Nashik');


-- ═══════════════════════════════════════════════════════════════
-- 1. CHHATRAPATI SAMBHAJINAGAR  (9 talukas)
-- ═══════════════════════════════════════════════════════════════
INSERT IGNORE INTO talukas (district_id, name) VALUES
  (@d_csn, 'Chhatrapati Sambhajinagar'),
  (@d_csn, 'Paithan'),
  (@d_csn, 'Gangapur'),
  (@d_csn, 'Kannad'),
  (@d_csn, 'Sillod'),
  (@d_csn, 'Soegaon'),
  (@d_csn, 'Phulambri'),
  (@d_csn, 'Khuldabad'),
  (@d_csn, 'Vaijapur');

SET @t_csn     = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Chhatrapati Sambhajinagar');
SET @t_paithan = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Paithan');
SET @t_gangapr = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Gangapur');
SET @t_kannad  = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Kannad');
SET @t_sillod  = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Sillod');
SET @t_soegaon = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Soegaon');
SET @t_phul    = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Phulambri');
SET @t_khuld   = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Khuldabad');
SET @t_vaij    = (SELECT id FROM talukas WHERE district_id = @d_csn AND name = 'Vaijapur');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_csn, 'Aurangabad',             '431001'),
  (@t_csn, 'Waluj',                  '431136'),
  (@t_csn, 'Chikalthana',            '431210'),
  (@t_csn, 'Garkheda',               '431009'),
  (@t_csn, 'Mukundwadi',             '431008'),
  (@t_csn, 'Kanchanwadi',            '431005'),
  (@t_csn, 'Padegaon',               '431009'),
  (@t_csn, 'Harsul',                 '431003'),
  (@t_csn, 'Satara',                 '431010'),
  (@t_csn, 'Cidco',                  '431003'),
  (@t_csn, 'Pundaliknagar',          '431002'),
  (@t_csn, 'Osmanpura',              '431001');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_paithan, 'Paithan',            '431107'),
  (@t_paithan, 'Apegaon',            '431107'),
  (@t_paithan, 'Jategaon',           '431107'),
  (@t_paithan, 'Nimgaon Gangarda',   '431107'),
  (@t_paithan, 'Balapur',            '431107'),
  (@t_paithan, 'Wasuli',             '431107'),
  (@t_paithan, 'Taklimiya',          '431107'),
  (@t_paithan, 'Nanegaon',           '431107');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_gangapr, 'Gangapur',           '431109'),
  (@t_gangapr, 'Walchandnagar',      '431109'),
  (@t_gangapr, 'Ladsawangi',         '431109'),
  (@t_gangapr, 'Shingnapur',         '431109'),
  (@t_gangapr, 'Takali Dhokeshwar',  '431109'),
  (@t_gangapr, 'Rajanwadi',          '431109'),
  (@t_gangapr, 'Pimpalgaon Gangapur','431109');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_kannad,  'Kannad',             '431103'),
  (@t_kannad,  'Sultanpur',          '431103'),
  (@t_kannad,  'Umbargaon',          '431103'),
  (@t_kannad,  'Gevrai',             '431103'),
  (@t_kannad,  'Aasegaon',           '431103'),
  (@t_kannad,  'Wadi',               '431103'),
  (@t_kannad,  'Pimpalgaon Gav',     '431103');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_sillod,  'Sillod',             '431112'),
  (@t_sillod,  'Bharampur',          '431113'),
  (@t_sillod,  'Ajintha',            '431122'),
  (@t_sillod,  'Ladsawangi',         '431113'),
  (@t_sillod,  'Wanegaon',           '431112'),
  (@t_sillod,  'Dhad',               '431112'),
  (@t_sillod,  'Lasur',              '431113');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_soegaon, 'Soegaon',            '431121'),
  (@t_soegaon, 'Nimkhed',            '431121'),
  (@t_soegaon, 'Ambe',               '431121'),
  (@t_soegaon, 'Takarkheda',         '431121'),
  (@t_soegaon, 'Pimpalgaon Ambe',    '431121'),
  (@t_soegaon, 'Golegaon',           '431121');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_phul,    'Phulambri',          '431111'),
  (@t_phul,    'Dhamangaon',         '431111'),
  (@t_phul,    'Khatgaon',           '431111'),
  (@t_phul,    'Pimpalgaon Gogal',   '431111'),
  (@t_phul,    'Shivna',             '431111'),
  (@t_phul,    'Warud',              '431111');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_khuld,   'Khuldabad',          '431101'),
  (@t_khuld,   'Rauza',              '431101'),
  (@t_khuld,   'Verul',              '431101'),
  (@t_khuld,   'Pimpalgaon Sadha',   '431101'),
  (@t_khuld,   'Ghardondi',          '431101'),
  (@t_khuld,   'Ellora',             '431102');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_vaij,    'Vaijapur',           '431301'),
  (@t_vaij,    'Lasur Station',      '431302'),
  (@t_vaij,    'Chandori',           '431301'),
  (@t_vaij,    'Sarola Baddi',       '431302'),
  (@t_vaij,    'Balapur',            '431301'),
  (@t_vaij,    'Kalamb',             '431301'),
  (@t_vaij,    'Golegaon',           '431301');


-- ═══════════════════════════════════════════════════════════════
-- 2. AHILYANAGAR  (12 talukas)
-- ═══════════════════════════════════════════════════════════════
INSERT IGNORE INTO talukas (district_id, name) VALUES
  (@d_ahn, 'Ahmednagar'),
  (@d_ahn, 'Shrigonda'),
  (@d_ahn, 'Karjat'),
  (@d_ahn, 'Jamkhed'),
  (@d_ahn, 'Parner'),
  (@d_ahn, 'Shevgaon'),
  (@d_ahn, 'Rahuri'),
  (@d_ahn, 'Kopargaon'),
  (@d_ahn, 'Sangamner'),
  (@d_ahn, 'Nevasa'),
  (@d_ahn, 'Akole'),
  (@d_ahn, 'Pathardi');

SET @t_ahn      = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Ahmednagar');
SET @t_shrig    = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Shrigonda');
SET @t_karjat   = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Karjat');
SET @t_jamkhed  = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Jamkhed');
SET @t_parner   = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Parner');
SET @t_shevgaon = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Shevgaon');
SET @t_rahuri   = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Rahuri');
SET @t_kopargaon= (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Kopargaon');
SET @t_sangamner= (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Sangamner');
SET @t_nevasa   = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Nevasa');
SET @t_akole    = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Akole');
SET @t_pathardi = (SELECT id FROM talukas WHERE district_id = @d_ahn AND name = 'Pathardi');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_ahn,     'Ahmednagar',         '414001'),
  (@t_ahn,     'Savedi',             '414003'),
  (@t_ahn,     'Bhingar',            '414002'),
  (@t_ahn,     'Tophkhana',          '414001'),
  (@t_ahn,     'Kothari',            '414001'),
  (@t_ahn,     'Burudgaon',          '414001'),
  (@t_ahn,     'Pimpalgaon Pathare', '414001'),
  (@t_ahn,     'Newasa Phata',       '414001');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_shrig,   'Shrigonda',          '413701'),
  (@t_shrig,   'Belvandi',           '413702'),
  (@t_shrig,   'Kolhewadi',          '413701'),
  (@t_shrig,   'Babulgaon',          '413701'),
  (@t_shrig,   'Malegaon Shrigonda', '413701'),
  (@t_shrig,   'Koregaon Bhima',     '413701');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_karjat,  'Karjat',             '414402'),
  (@t_karjat,  'Talegaon Dige',      '414402'),
  (@t_karjat,  'Chincholi',          '414402'),
  (@t_karjat,  'Nighoj',             '414402'),
  (@t_karjat,  'Otur',               '412409'),
  (@t_karjat,  'Pimpalgaon Karjat',  '414402');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_jamkhed, 'Jamkhed',            '413201'),
  (@t_jamkhed, 'Mhasoba',            '413201'),
  (@t_jamkhed, 'Jeur',               '413201'),
  (@t_jamkhed, 'Padhegaon',          '413201'),
  (@t_jamkhed, 'Natepute',           '413211'),
  (@t_jamkhed, 'Pangaon',            '413201');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_parner,  'Parner',             '414302'),
  (@t_parner,  'Nimblak',            '414302'),
  (@t_parner,  'Pimpalner',          '414302'),
  (@t_parner,  'Wadgaon Gupta',      '414302'),
  (@t_parner,  'Kanhur Pathar',      '414304'),
  (@t_parner,  'Takali Parner',      '414302');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_shevgaon,'Shevgaon',           '414502'),
  (@t_shevgaon,'Bodhegaon',          '414502'),
  (@t_shevgaon,'Kashti',             '414502'),
  (@t_shevgaon,'Lasur',              '414504'),
  (@t_shevgaon,'Pangaon',            '414502'),
  (@t_shevgaon,'Nimon',              '414502');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_rahuri,  'Rahuri',             '413705'),
  (@t_rahuri,  'Shrirampur',         '413709'),
  (@t_rahuri,  'Belapur',            '413708'),
  (@t_rahuri,  'Pravara Sangam',     '413705'),
  (@t_rahuri,  'Ghulewadi',          '413706'),
  (@t_rahuri,  'Rahata',             '423107'),
  (@t_rahuri,  'Loni',               '413736');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_kopargaon,'Kopargaon',         '423601'),
  (@t_kopargaon,'Shirdi',            '423109'),
  (@t_kopargaon,'Rahata',            '423107'),
  (@t_kopargaon,'Ghargaon',          '423601'),
  (@t_kopargaon,'Savedi Kopargaon',  '423601'),
  (@t_kopargaon,'Pathardi Kopargaon','423601'),
  (@t_kopargaon,'Pimpalgaon Baswant','423209');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_sangamner,'Sangamner',         '422605'),
  (@t_sangamner,'Ghargaon',          '422605'),
  (@t_sangamner,'Nimgaon Mhalungi',  '422605'),
  (@t_sangamner,'Pimpalgaon Rotha',  '422605'),
  (@t_sangamner,'Ashvi BK',          '422607'),
  (@t_sangamner,'Samsherpur',        '422605');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_nevasa,  'Nevasa',             '414603'),
  (@t_nevasa,  'Ghospuri',           '414604'),
  (@t_nevasa,  'Sonai',              '414105'),
  (@t_nevasa,  'Puntamba',           '414607'),
  (@t_nevasa,  'Balwadi',            '414603'),
  (@t_nevasa,  'Tisgaon',            '414603');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_akole,   'Akole',              '422601'),
  (@t_akole,   'Rajur',              '422602'),
  (@t_akole,   'Shendi',             '422401'),
  (@t_akole,   'Agasti',             '422601'),
  (@t_akole,   'Chinchner',          '422601'),
  (@t_akole,   'Umbarthan Akole',    '422601');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_pathardi,'Pathardi',           '414102'),
  (@t_pathardi,'Supa',               '414106'),
  (@t_pathardi,'Kolhar',             '414001'),
  (@t_pathardi,'Puntamba',           '414102'),
  (@t_pathardi,'Pangaon Pathardi',   '414102'),
  (@t_pathardi,'Rahuri Factory',     '413705');


-- ═══════════════════════════════════════════════════════════════
-- 3. PUNE  (13 talukas)
-- ═══════════════════════════════════════════════════════════════
INSERT IGNORE INTO talukas (district_id, name) VALUES
  (@d_pune, 'Haveli'),
  (@d_pune, 'Khed'),
  (@d_pune, 'Junnar'),
  (@d_pune, 'Ambegaon'),
  (@d_pune, 'Maval'),
  (@d_pune, 'Mulshi'),
  (@d_pune, 'Velhe'),
  (@d_pune, 'Bhor'),
  (@d_pune, 'Purandar'),
  (@d_pune, 'Indapur'),
  (@d_pune, 'Daund'),
  (@d_pune, 'Baramati'),
  (@d_pune, 'Shirur');

SET @t_haveli   = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Haveli');
SET @t_khed     = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Khed');
SET @t_junnar   = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Junnar');
SET @t_ambegaon = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Ambegaon');
SET @t_maval    = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Maval');
SET @t_mulshi   = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Mulshi');
SET @t_velhe    = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Velhe');
SET @t_bhor     = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Bhor');
SET @t_purandar = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Purandar');
SET @t_indapur  = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Indapur');
SET @t_daund    = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Daund');
SET @t_baramati = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Baramati');
SET @t_shirur   = (SELECT id FROM talukas WHERE district_id = @d_pune AND name = 'Shirur');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_haveli,  'Wagholi',            '412207'),
  (@t_haveli,  'Kharadi',            '411014'),
  (@t_haveli,  'Lohegaon',           '411032'),
  (@t_haveli,  'Manjri',             '412307'),
  (@t_haveli,  'Uruli Kanchan',      '412202'),
  (@t_haveli,  'Mundhwa',            '411036'),
  (@t_haveli,  'Undri',              '411060'),
  (@t_haveli,  'Pisoli',             '411060'),
  (@t_haveli,  'Handewadi',          '411028'),
  (@t_haveli,  'Nanded Phata',       '411041');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_khed,    'Chakan',             '410501'),
  (@t_khed,    'Rajgurunagar',       '410505'),
  (@t_khed,    'Khed',               '410501'),
  (@t_khed,    'Alandi',             '412105'),
  (@t_khed,    'Wadki',              '412506'),
  (@t_khed,    'Pimpalgaon Baswant', '410510'),
  (@t_khed,    'Kuruli',             '410501');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_junnar,  'Junnar',             '410502'),
  (@t_junnar,  'Narayangaon',        '410504'),
  (@t_junnar,  'Otur',               '410506'),
  (@t_junnar,  'Awas',               '410502'),
  (@t_junnar,  'Pimpalgaon Joga',    '412404'),
  (@t_junnar,  'Aakulwadi',          '410502');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_ambegaon,'Ghodegaon',          '410503'),
  (@t_ambegaon,'Ambegaon',           '410503'),
  (@t_ambegaon,'Kadus',              '410501'),
  (@t_ambegaon,'Ghoda',              '410515'),
  (@t_ambegaon,'Kothale',            '412401'),
  (@t_ambegaon,'Manchar',            '410503');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_maval,   'Talegaon Dabhade',   '410507'),
  (@t_maval,   'Vadgaon Maval',      '410509'),
  (@t_maval,   'Dehu Road',          '412101'),
  (@t_maval,   'Kamshet',            '410405'),
  (@t_maval,   'Kanhe',              '410501'),
  (@t_maval,   'Shirgaon',           '410506');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_mulshi,  'Pirangut',           '412115'),
  (@t_mulshi,  'Paud',               '412108'),
  (@t_mulshi,  'Lavale',             '412115'),
  (@t_mulshi,  'Hinjewadi',          '411057'),
  (@t_mulshi,  'Nere',               '412115'),
  (@t_mulshi,  'Mulshi',             '412108');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_velhe,   'Velhe',              '412212'),
  (@t_velhe,   'Nashrapur',          '412213'),
  (@t_velhe,   'Pargaon',            '412212'),
  (@t_velhe,   'Khed Shivapur',      '412205'),
  (@t_velhe,   'Shivthar',           '412212'),
  (@t_velhe,   'Bhose',              '412213');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_bhor,    'Bhor',               '412206'),
  (@t_bhor,    'Nira',               '412102'),
  (@t_bhor,    'Pargaon Tarfe Bhor', '412206'),
  (@t_bhor,    'Sangrun',            '412206'),
  (@t_bhor,    'Bhorgiri',           '412206'),
  (@t_bhor,    'Bharatgaon',         '412206');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_purandar,'Saswad',             '412301'),
  (@t_purandar,'Jejuri',             '412303'),
  (@t_purandar,'Dive',               '412305'),
  (@t_purandar,'Morgaon',            '412303'),
  (@t_purandar,'Narayanpur',         '412213'),
  (@t_purandar,'Nhavare',            '412301');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_indapur, 'Indapur',            '413106'),
  (@t_indapur, 'Bhigwan',            '413130'),
  (@t_indapur, 'Nimgaon Mhalungi',   '413106'),
  (@t_indapur, 'Wakhari',            '413106'),
  (@t_indapur, 'Pargaon Bhigwan',    '413130'),
  (@t_indapur, 'Tandali',            '413106');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_daund,   'Daund',              '413801'),
  (@t_daund,   'Yevat',              '413802'),
  (@t_daund,   'Patas',              '413801'),
  (@t_daund,   'Kedgaon',            '413801'),
  (@t_daund,   'Malthan',            '413801'),
  (@t_daund,   'Kurkumbh',           '413802');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_baramati,'Baramati',           '413102'),
  (@t_baramati,'Malegaon Khurd',     '413104'),
  (@t_baramati,'Supe',               '413102'),
  (@t_baramati,'Pimpri BK',          '413101'),
  (@t_baramati,'Koregaon BK',        '413102'),
  (@t_baramati,'Morgaon',            '413102');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_shirur,  'Shirur',             '412210'),
  (@t_shirur,  'Ranjangaon',         '412220'),
  (@t_shirur,  'Shikrapur',          '412105'),
  (@t_shirur,  'Koregaon Bhima',     '412216'),
  (@t_shirur,  'Takali Haji',        '412201'),
  (@t_shirur,  'Pargaon Memane',     '412210');


-- ═══════════════════════════════════════════════════════════════
-- 4. NASHIK  (15 talukas)
-- ═══════════════════════════════════════════════════════════════
INSERT IGNORE INTO talukas (district_id, name) VALUES
  (@d_nashik, 'Nashik'),
  (@d_nashik, 'Dindori'),
  (@d_nashik, 'Igatpuri'),
  (@d_nashik, 'Sinnar'),
  (@d_nashik, 'Niphad'),
  (@d_nashik, 'Yeola'),
  (@d_nashik, 'Chandwad'),
  (@d_nashik, 'Nandgaon'),
  (@d_nashik, 'Malegaon'),
  (@d_nashik, 'Baglan'),
  (@d_nashik, 'Peint'),
  (@d_nashik, 'Surgana'),
  (@d_nashik, 'Kalwan'),
  (@d_nashik, 'Trimbakeshwar'),
  (@d_nashik, 'Deola');

SET @t_nashik  = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Nashik');
SET @t_dindori = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Dindori');
SET @t_igatpuri= (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Igatpuri');
SET @t_sinnar  = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Sinnar');
SET @t_niphad  = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Niphad');
SET @t_yeola   = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Yeola');
SET @t_chandwad= (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Chandwad');
SET @t_nandgaon= (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Nandgaon');
SET @t_malegaon= (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Malegaon');
SET @t_baglan  = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Baglan');
SET @t_peint   = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Peint');
SET @t_surgana = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Surgana');
SET @t_kalwan  = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Kalwan');
SET @t_trimbak = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Trimbakeshwar');
SET @t_deola   = (SELECT id FROM talukas WHERE district_id = @d_nashik AND name = 'Deola');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_nashik,  'Nashik City',        '422001'),
  (@t_nashik,  'Nashik Road',        '422101'),
  (@t_nashik,  'Deolali',            '422401'),
  (@t_nashik,  'Satpur',             '422007'),
  (@t_nashik,  'Ambad',              '422010'),
  (@t_nashik,  'Panchavati',         '422003'),
  (@t_nashik,  'Cidco Nashik',       '422008'),
  (@t_nashik,  'Gangapur Road',      '422005'),
  (@t_nashik,  'Pathardi Nashik',    '422010'),
  (@t_nashik,  'Adgaon',             '422003');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_dindori, 'Dindori',            '422202'),
  (@t_dindori, 'Vani',               '422215'),
  (@t_dindori, 'Belatgaon',          '422202'),
  (@t_dindori, 'Moshegaon',          '422202'),
  (@t_dindori, 'Peth',               '422208'),
  (@t_dindori, 'Wavi',               '422202');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_igatpuri,'Igatpuri',           '422403'),
  (@t_igatpuri,'Ghoti',              '422402'),
  (@t_igatpuri,'Khangaon',           '422403'),
  (@t_igatpuri,'Bhojapur',           '422403'),
  (@t_igatpuri,'Kasara',             '422403'),
  (@t_igatpuri,'Ambewangan',         '422403');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_sinnar,  'Sinnar',             '422103'),
  (@t_sinnar,  'Musalgaon',          '422103'),
  (@t_sinnar,  'Chandori',           '422103'),
  (@t_sinnar,  'Nandur Shingote',    '422103'),
  (@t_sinnar,  'Wadivarhe',          '422103'),
  (@t_sinnar,  'Nimgaon Sinnar',     '422103');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_niphad,  'Niphad',             '422303'),
  (@t_niphad,  'Lasalgaon',          '422306'),
  (@t_niphad,  'Pimpalgaon Baswant', '422209'),
  (@t_niphad,  'Vinchur',            '422303'),
  (@t_niphad,  'Nandur Madhyameshwar','422303'),
  (@t_niphad,  'Ozar',               '422206');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_yeola,   'Yeola',              '423401'),
  (@t_yeola,   'Ankai',              '423401'),
  (@t_yeola,   'Nimgaon Sawa',       '423401'),
  (@t_yeola,   'Palaskheda',         '423401'),
  (@t_yeola,   'Songir',             '423401'),
  (@t_yeola,   'Vadgaon Yeola',      '423401');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_chandwad,'Chandwad',           '423101'),
  (@t_chandwad,'Vinchur Chandwad',   '423101'),
  (@t_chandwad,'Karanjali',          '423101'),
  (@t_chandwad,'Umrane',             '423101'),
  (@t_chandwad,'Nandgaon Khandesh',  '423105'),
  (@t_chandwad,'Pimpalgaon Chandwad','423101');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_nandgaon,'Nandgaon',           '423106'),
  (@t_nandgaon,'Manmad',             '423104'),
  (@t_nandgaon,'Nampur',             '423106'),
  (@t_nandgaon,'Vadner Bhairav',     '423104'),
  (@t_nandgaon,'Ankai Nandgaon',     '423106'),
  (@t_nandgaon,'Pimpalgaon Nandgaon','423106');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_malegaon,'Malegaon',           '423203'),
  (@t_malegaon,'Vadel',              '423203'),
  (@t_malegaon,'Pimpalgaon Kale',    '423203'),
  (@t_malegaon,'Taharabad',          '423203'),
  (@t_malegaon,'Chandori Malegaon',  '423203'),
  (@t_malegaon,'Nandgaon Malegaon',  '423203');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_baglan,  'Satana',             '423301'),
  (@t_baglan,  'Manur',              '423301'),
  (@t_baglan,  'Baglan',             '423301'),
  (@t_baglan,  'Nardane',            '423301'),
  (@t_baglan,  'Pimparne',           '423301'),
  (@t_baglan,  'Prakashe',           '423301');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_peint,   'Peint',              '422209'),
  (@t_peint,   'Dabhadi',            '422209'),
  (@t_peint,   'Pimpri Peint',       '422209'),
  (@t_peint,   'Umbarthan Peint',    '422209'),
  (@t_peint,   'Khirdi',             '422209');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_surgana, 'Surgana',            '422401'),
  (@t_surgana, 'Savkhed',            '422401'),
  (@t_surgana, 'Dhodambe',           '422401'),
  (@t_surgana, 'Hattapad',           '422401'),
  (@t_surgana, 'Kothambe',           '422401');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_kalwan,  'Kalwan',             '423501'),
  (@t_kalwan,  'Thangaon',           '423501'),
  (@t_kalwan,  'Chandwad Road',      '423501'),
  (@t_kalwan,  'Mokhada',            '421601'),
  (@t_kalwan,  'Pimpalgaon Kalwan',  '423501');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_trimbak, 'Trimbak',            '422212'),
  (@t_trimbak, 'Anjaneri',           '422212'),
  (@t_trimbak, 'Brahmagiri',         '422212'),
  (@t_trimbak, 'Gangapur Dam Area',  '422222'),
  (@t_trimbak, 'Umbarkhed',          '422212'),
  (@t_trimbak, 'Vaitarna',           '422212');

INSERT INTO villages (taluka_id, name, pin_code) VALUES
  (@t_deola,   'Deola',              '423102'),
  (@t_deola,   'Chande',             '423102'),
  (@t_deola,   'Pimpalgaon Garud',   '423102'),
  (@t_deola,   'Nandgaon Deola',     '423102'),
  (@t_deola,   'Yeola Road',         '423102');


-- ─── VERIFICATION COUNTS ──────────────────────────────────────
SELECT 'States'    AS entity, COUNT(*) AS total FROM states;
SELECT 'Districts' AS entity, COUNT(*) AS total FROM districts;
SELECT 'Talukas'   AS entity, COUNT(*) AS total FROM talukas;
SELECT 'Villages'  AS entity, COUNT(*) AS total FROM villages;
