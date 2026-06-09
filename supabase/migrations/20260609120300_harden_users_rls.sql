-- ============================================
-- CLUB 90+1 — Blindaje de columnas privilegiadas en `users` (RLS hardening)
-- ============================================
-- HUECO: la política RLS "Users can update their own profile" deja que un usuario
-- edite su PROPIA fila sin restricción de columnas → con solo la anon key podía
-- auto-promoverse `role`/`accountTier` o inflar `clCoins`/`storedLifeSavers`.
--
-- FIX (aditivo y reversible): privilegios a NIVEL DE COLUMNA. Se revoca el UPDATE
-- amplio a los roles de cliente y se concede UPDATE solo en columnas inofensivas
-- (`name`, `realTeamId`). La política RLS de fila se mantiene tal cual.
--
-- Por qué NO rompe nada: las RPC `SECURITY DEFINER` (redeem_emission_code,
-- submit_ticket, etc.) corren como DUEÑO (postgres) y los privilegios de columna
-- NO se les aplican — siguen acreditando `clCoins`, promoviendo a PREMIUM, etc.
-- El frontend nunca hace UPDATE directo a `users` (solo a `teams`/`players`).
-- `service_role` (Edge Functions) tampoco se ve afectado.
-- ============================================

-- 1. Quitar el UPDATE amplio a los roles de cliente
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;

-- 2. Conceder UPDATE solo en columnas inofensivas (self-service de perfil)
GRANT UPDATE (name, "realTeamId") ON public.users TO authenticated;

SELECT '✅ users blindada: authenticated solo puede UPDATE de name/realTeamId' AS status;

-- ── PARA REVERTIR (si hiciera falta) ─────────────────────────────────────────
-- REVOKE UPDATE (name, "realTeamId") ON public.users FROM authenticated;
-- GRANT UPDATE ON public.users TO authenticated;