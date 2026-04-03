-- ============================================
-- CLUB 90+1 — Fix RLS Policies for User Registration
-- Run this in Supabase SQL Editor (Dashboard > SQL > New Query)
-- ============================================
-- NOTE: Prisma uses camelCase column names (userId, clCoins, etc.)

-- 1. Enable RLS on users table (if not already)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.users;

-- 3. Allow authenticated users to INSERT their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid()::text);

-- 4. Allow all authenticated users to view any profile (needed for leaderboard)
CREATE POLICY "Anyone can view leaderboard" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (true);

-- 5. Allow authenticated users to UPDATE their own profile
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- 6. Store items - readable by all
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view store items" ON public.store_items;
CREATE POLICY "Anyone can view store items" 
ON public.store_items 
FOR SELECT 
TO authenticated 
USING (true);

-- 7. Real teams - readable by all
ALTER TABLE public.real_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view real teams" ON public.real_teams;
CREATE POLICY "Anyone can view real teams" 
ON public.real_teams 
FOR SELECT 
TO authenticated 
USING (true);

-- 8. Match markets - readable by all
ALTER TABLE public.match_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view match markets" ON public.match_markets;
CREATE POLICY "Anyone can view match markets" 
ON public.match_markets 
FOR SELECT 
TO authenticated 
USING (true);

-- 9. Prediction tickets RLS (camelCase: "userId")
ALTER TABLE public.prediction_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.prediction_tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.prediction_tickets;

CREATE POLICY "Users can view own tickets" 
ON public.prediction_tickets 
FOR SELECT 
TO authenticated 
USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can insert own tickets" 
ON public.prediction_tickets 
FOR INSERT 
TO authenticated 
WITH CHECK ("userId" = auth.uid()::text);

-- 10. Transactions RLS (camelCase: "userId")
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING ("userId" = auth.uid()::text);

-- 11. Ticket items - readable by authenticated
ALTER TABLE public.ticket_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view ticket items" ON public.ticket_items;
CREATE POLICY "Anyone can view ticket items" 
ON public.ticket_items 
FOR SELECT 
TO authenticated 
USING (true);

-- 12. Redemption tickets RLS (camelCase: "userId")
ALTER TABLE public.redemption_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redemption_tickets;
CREATE POLICY "Users can view own redemptions" 
ON public.redemption_tickets 
FOR SELECT 
TO authenticated 
USING ("userId" = auth.uid()::text);

-- 13. Real players - readable by all
ALTER TABLE public.real_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view real players" ON public.real_players;
CREATE POLICY "Anyone can view real players" 
ON public.real_players 
FOR SELECT 
TO authenticated 
USING (true);

-- 14. Auto-create user profile on registration via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, name, "clCoins", role, "accountTier", "isBankrupt", "currentStreak", "storedLifeSavers")
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', 'Jugador'),
    0,
    'PLAYER',
    'GUEST',
    false,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
