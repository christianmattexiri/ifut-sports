-- 1) Migra os votos de MVP que ainda apontavam para o user_id antigo do Richard
UPDATE public.game_votes
SET mvp_id = '41c427ee-fbb1-42d8-95db-3f2005e45d0b'
WHERE game_id = '56979f0a-7aa5-4217-b4e5-2e1615ed5bd1'
  AND mvp_id = '44f03f1b-9149-47e8-8132-0530d2f200fc';

-- 2) Define Richard como MVP oficial da última partida
UPDATE public.games
SET mvp_id = '41c427ee-fbb1-42d8-95db-3f2005e45d0b'
WHERE id = '56979f0a-7aa5-4217-b4e5-2e1615ed5bd1';

-- 3) Soma +1 MVP no perfil do Richard
UPDATE public.profiles
SET total_mvps = COALESCE(total_mvps, 0) + 1
WHERE id = '41c427ee-fbb1-42d8-95db-3f2005e45d0b';