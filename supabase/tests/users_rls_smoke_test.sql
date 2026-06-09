-- ============================================
-- CLUB 90+1 — Smoke test del blindaje de `users` (RLS hardening)
-- ============================================
-- Correr DESPUÉS de aplicar 20260609120300_harden_users_rls.sql.
-- Pegar en el SQL Editor de Supabase. Transaccional (ROLLBACK): no deja datos.
--
-- Simula un usuario autenticado con SET LOCAL ROLE authenticated + request.jwt.claims
-- y verifica:
--   ❌ NO puede cambiar  role, accountTier, clCoins, storedLifeSavers
--   ✅ SÍ puede cambiar  name (lo inofensivo)
--   ✅ tras el intento, las columnas protegidas siguen intactas
--
-- Éxito = "Success. No rows returned" (sin error). Cualquier fallo lanza EXCEPTION.
-- ============================================

BEGIN;

DO $$
DECLARE
    v_uid   TEXT := '33333333-3333-3333-3333-333333333333';
    v_name  TEXT;
    v_role  TEXT;
    v_tier  TEXT;
    v_coins FLOAT;
    v_ls    INT;
BEGIN
    -- Fixture (como dueño)
    INSERT INTO users (id, phone, name, "clCoins", role, "accountTier", "isBankrupt", "currentStreak", "storedLifeSavers", "createdAt")
    VALUES (v_uid, 'trls00001', 'Original', 100, 'PLAYER', 'GUEST', false, 0, 0, now());

    -- Simular usuario autenticado
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    -- ── Debe RECHAZAR columnas protegidas ──
    BEGIN
        UPDATE users SET role = 'ADMIN' WHERE id = v_uid;
        RAISE EXCEPTION '❌ pudo cambiar role';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'role: bloqueado ✅'; END;

    BEGIN
        UPDATE users SET "accountTier" = 'PREMIUM' WHERE id = v_uid;
        RAISE EXCEPTION '❌ pudo cambiar accountTier';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'accountTier: bloqueado ✅'; END;

    BEGIN
        UPDATE users SET "clCoins" = 999999 WHERE id = v_uid;
        RAISE EXCEPTION '❌ pudo cambiar clCoins';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'clCoins: bloqueado ✅'; END;

    BEGIN
        UPDATE users SET "storedLifeSavers" = 99 WHERE id = v_uid;
        RAISE EXCEPTION '❌ pudo cambiar storedLifeSavers';
    EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'storedLifeSavers: bloqueado ✅'; END;

    -- ── Debe PERMITIR lo inofensivo (name) ──
    UPDATE users SET name = 'Cambiado OK' WHERE id = v_uid;
    SELECT name INTO v_name FROM users WHERE id = v_uid;
    IF v_name <> 'Cambiado OK' THEN
        RAISE EXCEPTION '❌ no pudo cambiar name (debía permitirse)';
    END IF;
    RAISE NOTICE 'name: editable ✅ (%)', v_name;

    -- Volver a dueño y verificar que lo protegido NO cambió
    EXECUTE 'RESET ROLE';
    SELECT role, "accountTier", "clCoins", "storedLifeSavers"
      INTO v_role, v_tier, v_coins, v_ls
    FROM users WHERE id = v_uid;

    IF v_role = 'PLAYER' AND v_tier = 'GUEST' AND v_coins = 100 AND v_ls = 0 THEN
        RAISE NOTICE '✅✅✅ Blindaje OK: protegido intacto (role=% tier=% coins=% ls=%), name editable',
            v_role, v_tier, v_coins, v_ls;
    ELSE
        RAISE EXCEPTION '❌ una columna protegida cambió: role=% tier=% coins=% ls=%',
            v_role, v_tier, v_coins, v_ls;
    END IF;
END $$;

ROLLBACK;