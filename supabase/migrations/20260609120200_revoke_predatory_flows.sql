-- ============================================
-- CLUB 90+1 — REVOCAR ejecución de funciones predatorias (REVERSIBLE)
-- ============================================
-- PLAN_MUNDIAL §0 "Líneas rojas": las monedas se GANAN consumiendo, NUNCA se venden.
--
-- En vez de DROP (destructivo), se REVOCA el permiso de ejecución: las funciones
-- siguen existiendo pero nadie puede invocarlas. 100% reversible con un GRANT
-- (ver bloque comentado al final). Verificado: ningún frontend/bot/Edge las llama.
--
-- ⚠️ NO APLICADA AÚN — dejada lista. Aplicar cuando el usuario lo confirme.
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT proname, pg_get_function_identity_arguments(oid) AS args
        FROM pg_proc
        WHERE proname IN ('activate_premium_pass', 'handle_lifesaver_topup', 'handle_topup')
    LOOP
        EXECUTE format(
            'REVOKE EXECUTE ON FUNCTION %I(%s) FROM PUBLIC, anon, authenticated',
            r.proname, r.args
        );
        RAISE NOTICE 'Revocado EXECUTE en %(%)', r.proname, r.args;
    END LOOP;
END $$;

SELECT '✅ Revocación aplicada (reversible). Funciones predatorias quedan no-ejecutables.' AS status;

-- ── PARA REVERTIR (si hiciera falta) ─────────────────────────────────────────
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT proname, pg_get_function_identity_arguments(oid) AS args
--            FROM pg_proc
--            WHERE proname IN ('activate_premium_pass','handle_lifesaver_topup','handle_topup')
--   LOOP
--     EXECUTE format('GRANT EXECUTE ON FUNCTION %I(%s) TO authenticated', r.proname, r.args);
--   END LOOP;
-- END $$;