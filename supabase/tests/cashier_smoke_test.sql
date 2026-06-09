-- ============================================
-- CLUB 90+1 — Smoke test del módulo de cajero (3 pruebas)
-- ============================================
-- Correr DESPUÉS de aplicar 20260609120000_cashier_emission.sql.
-- Pegar tal cual en el SQL Editor de Supabase (o `psql`). Es transaccional y termina
-- en ROLLBACK: NO deja datos. Simula dos usuarios autenticados vía request.jwt.claims
-- (lo mismo que lee auth.uid()).
--
-- Pruebas:
--   (a) Happy path: cajero emite → cliente canjea → +500 COINS y pasa a PREMIUM.
--   (b) Tope 5.000/noche: con 4.900 ya ganados hoy, un código de +200 es rechazado.
--   (c) Código vencido (>10 min) es rechazado al canjear.
--
-- Resultado esperado: 3 líneas "✅" por NOTICE y al final "✅✅✅ Las 3 pruebas pasaron".
-- Si alguna falla, lanza EXCEPTION con el detalle y revierte todo.
-- ============================================

BEGIN;

DO $$
DECLARE
    v_res   JSONB;
    v_code  TEXT;
    v_bal   FLOAT;
    v_tier  TEXT;
    v_err   TEXT;
BEGIN
    -- ── Fixtures (ids fijos, teléfonos de prueba) ──
    INSERT INTO users (id, phone, name, "clCoins", role, "accountTier", "isBankrupt", "currentStreak", "storedLifeSavers", "createdAt")
    VALUES
        ('11111111-1111-1111-1111-111111111111', 'tcash00001', 'Cajero Test', 0, 'CASHIER', 'GUEST', false, 0, 0, now()),
        ('22222222-2222-2222-2222-222222222222',  'tplay00001', 'Jugador Test', 0, 'PLAYER',  'GUEST', false, 0, 0, now());

    -- ═══ (a) HAPPY PATH ═══
    PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
    v_res  := create_emission_code(50000);    -- 50.000 COP → 500 COINS
    v_code := v_res->>'code';
    RAISE NOTICE '(a) cajero emitió código % por % COINS', v_code, v_res->>'coinsValue';

    PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
    PERFORM redeem_emission_code(v_code);
    SELECT "clCoins", "accountTier" INTO v_bal, v_tier FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
    IF v_bal = 500 AND v_tier = 'PREMIUM' THEN
        RAISE NOTICE '(a) ✅ HAPPY PATH: balance=% tier=%', v_bal, v_tier;
    ELSE
        RAISE EXCEPTION '(a) ❌ esperaba 500/PREMIUM, obtuvo %/%', v_bal, v_tier;
    END IF;

    -- ═══ (b) TOPE 5.000/NOCHE ═══
    -- El jugador ya ganó 500 hoy (paso a). Le sumamos 4.400 simulando emisiones previas → 4.900.
    INSERT INTO transactions (id, "userId", "amountCOP", "coinsAdded", type, "referenceId", status, "createdAt")
    VALUES (gen_random_uuid()::text, '22222222-2222-2222-2222-222222222222', 440000, 4400, 'COINS_EARNED', 'TEST:seed-night', 'APPROVED', now());

    PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
    v_code := (create_emission_code(20000))->>'code';   -- +200 COINS → 4.900+200 = 5.100 > 5.000

    PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
    BEGIN
        PERFORM redeem_emission_code(v_code);
        RAISE EXCEPTION '(b) ❌ el tope NO se aplicó (dejó pasar 5.100)';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
        IF v_err LIKE '%Tope de la noche%' THEN
            RAISE NOTICE '(b) ✅ TOPE NOCTURNO rechazado: %', v_err;
        ELSE
            RAISE EXCEPTION '(b) ❌ error inesperado: %', v_err;
        END IF;
    END;

    -- ═══ (c) CÓDIGO VENCIDO ═══
    PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
    v_code := (create_emission_code(10000))->>'code';   -- 100 COINS
    UPDATE emission_codes SET "expiresAt" = now() - INTERVAL '1 minute'
    WHERE code = v_code AND status = 'PENDING';

    PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
    BEGIN
        PERFORM redeem_emission_code(v_code);
        RAISE EXCEPTION '(c) ❌ aceptó un código vencido';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
        IF v_err LIKE '%venció%' THEN
            RAISE NOTICE '(c) ✅ CÓDIGO VENCIDO rechazado: %', v_err;
        ELSE
            RAISE EXCEPTION '(c) ❌ error inesperado: %', v_err;
        END IF;
    END;

    RAISE NOTICE '✅✅✅ Las 3 pruebas pasaron';
END $$;

ROLLBACK;