-- ============================================
-- CLUB 90 — Seed Data
-- ============================================
-- Run this AFTER the migration.
-- Execute in: Supabase Dashboard > SQL Editor
--
-- NOTE: These users are created directly in public.users
-- (not via auth.users). For production, use
-- supabase.auth.admin.createUser() instead.
-- ============================================

-- ── Create test users ───────────────────────
-- (Using gen_random_uuid since these won't have auth accounts)

INSERT INTO auth.users (id, phone, raw_user_meta_data, created_at, updated_at, email_confirmed_at, phone_confirmed_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '573001000000', '{"name": "Admin Club 90"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', '573001111111', '{"name": "El Zarpazo"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', '573002222222', '{"name": "La Máquina"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000004', '573003333333', '{"name": "El Profeta"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000005', '573004444444', '{"name": "El Estratega"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000006', '573005555555', '{"name": "El Visionario"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000007', '573006666666', '{"name": "El Analítico"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000008', '573007777777', '{"name": "El Preciso"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000009', '573008888888', '{"name": "El Águila"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000010', '573009999999', '{"name": "El Táctico"}', NOW(), NOW(), NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000011', '573000000001', '{"name": "El Novato"}', NOW(), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- The trigger handle_new_user() auto-creates profiles in public.users.
-- Now update the CL COINS balances and admin role:

UPDATE users SET cl_coins = 999999, role = 'ADMIN' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE users SET cl_coins = 125000 WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE users SET cl_coins = 98500  WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE users SET cl_coins = 87200  WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE users SET cl_coins = 75000  WHERE id = 'a0000000-0000-0000-0000-000000000005';
UPDATE users SET cl_coins = 62300  WHERE id = 'a0000000-0000-0000-0000-000000000006';
UPDATE users SET cl_coins = 54100  WHERE id = 'a0000000-0000-0000-0000-000000000007';
UPDATE users SET cl_coins = 43800  WHERE id = 'a0000000-0000-0000-0000-000000000008';
UPDATE users SET cl_coins = 38500  WHERE id = 'a0000000-0000-0000-0000-000000000009';
UPDATE users SET cl_coins = 29200  WHERE id = 'a0000000-0000-0000-0000-000000000010';
UPDATE users SET cl_coins = 15000  WHERE id = 'a0000000-0000-0000-0000-000000000011';

-- ── Create matches (future dates) ───────────

INSERT INTO matches (id, home_team, away_team, start_time, status) VALUES
  (gen_random_uuid(), 'Barcelona',       'Real Madrid',    NOW() + INTERVAL '24 hours',  'OPEN'),
  (gen_random_uuid(), 'Manchester City', 'Liverpool',      NOW() + INTERVAL '48 hours',  'OPEN'),
  (gen_random_uuid(), 'PSG',             'Bayern Munich',  NOW() + INTERVAL '72 hours',  'OPEN'),
  (gen_random_uuid(), 'Juventus',        'AC Milan',       NOW() + INTERVAL '96 hours',  'OPEN'),
  (gen_random_uuid(), 'Atlético Nacional','Millonarios',   NOW() + INTERVAL '120 hours', 'OPEN');

-- ── Create match pools with pre-loaded bets ─

INSERT INTO match_pools (match_id, home_pool, draw_pool, away_pool)
SELECT id, 45000, 12000, 38000 FROM matches WHERE home_team = 'Barcelona';

INSERT INTO match_pools (match_id, home_pool, draw_pool, away_pool)
SELECT id, 30000, 15000, 25000 FROM matches WHERE home_team = 'Manchester City';

INSERT INTO match_pools (match_id, home_pool, draw_pool, away_pool)
SELECT id, 20000, 8000, 35000 FROM matches WHERE home_team = 'PSG';

INSERT INTO match_pools (match_id, home_pool, draw_pool, away_pool)
SELECT id, 18000, 22000, 16000 FROM matches WHERE home_team = 'Juventus';

INSERT INTO match_pools (match_id, home_pool, draw_pool, away_pool)
SELECT id, 28000, 10000, 19000 FROM matches WHERE home_team = 'Atlético Nacional';


-- ── Verify seed ─────────────────────────────
SELECT '✅ Seed complete!' AS status,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM matches) AS matches,
       (SELECT COUNT(*) FROM match_pools) AS pools;
