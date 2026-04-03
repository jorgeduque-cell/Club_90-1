-- ============================================
-- CLUB 90+1 — Quick Debug: Check if users exist
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Check auth users (registered accounts)
SELECT id, email, raw_user_meta_data, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check public.users (profiles)
SELECT id, phone, name, "clCoins", "accountTier"
FROM public.users 
LIMIT 5;

-- 3. If auth users exist but public.users is empty, 
--    manually sync them:
INSERT INTO public.users (id, phone, name, "clCoins", role, "accountTier", "isBankrupt", "currentStreak", "storedLifeSavers")
SELECT 
  u.id::text,
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'name', 'Jugador'),
  0, 'PLAYER', 'GUEST', false, 0, 0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = u.id::text
);
