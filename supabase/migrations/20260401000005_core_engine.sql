-- ============================================
-- CLUB 90+1 — CORE ENGINE: Submit + Settle + Streaks
-- ============================================
-- ⚠️ SUPERSEDED: submit_ticket replaced by 20260402000000_audit_remediation.sql
-- ⚠️ SUPERSEDED: settle_match_v2 replaced by 20260401000008_audit_sprint_fixes.sql
-- This migration still runs on fresh deploy (adds enum values in section 3)
-- but the function definitions are overwritten by later migrations.
-- ============================================

-- ═══════════════════════════════════════════
-- 0. DROP OLD FUNCTION SIGNATURES
-- ═══════════════════════════════════════════
-- Old submit_ticket had 3 params (p_user_id, p_selections, p_amount)
-- New version has 2 params (p_selections, p_amount) and uses auth.uid()

DROP FUNCTION IF EXISTS submit_ticket(TEXT, JSONB, FLOAT);

-- ═══════════════════════════════════════════
-- 1. SUBMIT TICKET RPC (New Schema)
-- ═══════════════════════════════════════════
-- User sends selections [{matchMarketId, outcome}] + amount
-- Creates prediction_ticket + ticket_items
-- Locks multipliers at bet time
-- Deducts CL COINS

CREATE OR REPLACE FUNCTION submit_ticket(
    p_selections JSONB,   -- [{matchMarketId, outcome}]
    p_amount     FLOAT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid           TEXT := auth.uid()::text;
    v_user          RECORD;
    v_ticket_id     TEXT;
    v_sel           JSONB;
    v_market        RECORD;
    v_outcome       TEXT;
    v_locked_mult   FLOAT;
    v_total_mult    FLOAT := 1.0;
    v_potential      FLOAT;
    v_max_stake     CONSTANT FLOAT := 5000;
    v_min_stake     CONSTANT FLOAT := 100;
    v_i             INT := 0;
BEGIN
    -- ── Validate auth ──
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- ── Validate amount ──
    IF p_amount < v_min_stake THEN
        RAISE EXCEPTION 'Apuesta mínima: % CL COINS', v_min_stake;
    END IF;
    IF p_amount > v_max_stake THEN
        RAISE EXCEPTION 'Apuesta máxima: % CL COINS', v_max_stake;
    END IF;

    -- ── Validate selections ──
    IF p_selections IS NULL OR jsonb_array_length(p_selections) = 0 THEN
        RAISE EXCEPTION 'Debes seleccionar al menos 1 partido';
    END IF;
    IF jsonb_array_length(p_selections) > 10 THEN
        RAISE EXCEPTION 'Máximo 10 partidos por ticket';
    END IF;

    -- ── Lock user row ──
    SELECT * INTO v_user FROM users WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    IF v_user."accountTier" != 'PREMIUM' THEN
        RAISE EXCEPTION 'Necesitas PASE PREMIUM para hacer pronósticos';
    END IF;
    IF v_user."clCoins" < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente. Tienes % CL pero intentas apostar %', v_user."clCoins", p_amount;
    END IF;

    -- ── Generate ticket ID ──
    v_ticket_id := gen_random_uuid()::text;

    -- ── Validate each selection and lock multipliers ──
    FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
    LOOP
        v_i := v_i + 1;
        v_outcome := v_sel->>'outcome';

        -- Validate outcome value
        IF v_outcome NOT IN ('HOME_WIN', 'DRAW', 'AWAY_WIN') THEN
            RAISE EXCEPTION 'Resultado inválido en selección %: %', v_i, v_outcome;
        END IF;

        -- Lock the match market
        SELECT * INTO v_market
        FROM match_markets
        WHERE id = (v_sel->>'matchMarketId')
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Partido % no encontrado', v_sel->>'matchMarketId';
        END IF;
        IF v_market.status != 'OPEN' THEN
            RAISE EXCEPTION 'El partido % ya está cerrado', v_i;
        END IF;
        IF v_market."startTime" - INTERVAL '5 minutes' < NOW() THEN
            RAISE EXCEPTION 'El partido % ya va a comenzar. Cierre: 5 min antes', v_i;
        END IF;

        -- Check no duplicate match in same ticket
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_selections) AS s2
            WHERE s2 != v_sel
            AND (s2->>'matchMarketId') = (v_sel->>'matchMarketId')
        ) THEN
            RAISE EXCEPTION 'No puedes seleccionar el mismo partido dos veces';
        END IF;

        -- Lock multiplier
        v_locked_mult := CASE v_outcome
            WHEN 'HOME_WIN' THEN v_market."multiplierHome"
            WHEN 'DRAW'     THEN v_market."multiplierDraw"
            WHEN 'AWAY_WIN' THEN v_market."multiplierAway"
        END;

        v_total_mult := v_total_mult * v_locked_mult;

        -- Insert ticket item
        INSERT INTO ticket_items (
            "id", "predictionTicketId", "matchMarketId", "selectedOutcome", "lockedMultiplier"
        ) VALUES (
            gen_random_uuid()::text, v_ticket_id, v_market.id, v_outcome::"PredictionOutcome", v_locked_mult
        );
    END LOOP;

    -- ── Calculate potential return ──
    v_potential := ROUND((p_amount * v_total_mult)::NUMERIC, 2);

    -- ── Create prediction ticket ──
    INSERT INTO prediction_tickets (
        "id", "userId", "totalAmount", "potentialReturn", "status", "createdAt"
    ) VALUES (
        v_ticket_id, v_uid, p_amount, v_potential, 'PENDING', now()
    );

    -- ── Deduct coins ──
    UPDATE users SET "clCoins" = "clCoins" - p_amount WHERE id = v_uid;

    -- ── Log transaction ──
    INSERT INTO transactions (
        "id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text, v_uid, 0, -p_amount,
        'REWARD_REDEMPTION', 'APPROVED', now()
    );

    RETURN jsonb_build_object(
        'ticketId',       v_ticket_id,
        'totalAmount',    p_amount,
        'totalMultiplier', ROUND(v_total_mult::NUMERIC, 2),
        'potentialReturn', v_potential,
        'selections',     jsonb_array_length(p_selections),
        'message',        '✅ Pronóstico registrado!'
    );
END;
$$;


-- ═══════════════════════════════════════════
-- 2. SETTLE MATCH V2 (New Schema)
-- ═══════════════════════════════════════════
-- Admin sets result on a match_market
-- Evaluates all ticket_items for that match
-- If ALL items in a ticket are resolved and correct → HIT + pay
-- If any item is wrong → MISSED

CREATE OR REPLACE FUNCTION settle_match_v2(
    p_match_id TEXT,
    p_result   TEXT   -- 'HOME_WIN', 'DRAW', 'AWAY_WIN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market         RECORD;
    v_item           RECORD;
    v_ticket         RECORD;
    v_ticket_id      TEXT;
    v_all_resolved   BOOLEAN;
    v_all_correct    BOOLEAN;
    v_total_items    INT;
    v_resolved_items INT;
    v_correct_items  INT;
    v_winners        INT := 0;
    v_losers         INT := 0;
    v_total_paid     FLOAT := 0;
    v_processed_tickets TEXT[] := '{}';
BEGIN
    -- ── Validate result ──
    IF p_result NOT IN ('HOME_WIN', 'DRAW', 'AWAY_WIN') THEN
        RAISE EXCEPTION 'Resultado inválido: %. Usa HOME_WIN, DRAW o AWAY_WIN', p_result;
    END IF;

    -- ── Lock and validate match ──
    SELECT * INTO v_market
    FROM match_markets
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partido no encontrado';
    END IF;
    IF v_market.status = 'FINISHED' THEN
        RAISE EXCEPTION 'Este partido ya fue liquidado';
    END IF;

    -- ── Update match status ──
    UPDATE match_markets
    SET result = p_result::"MatchResult",
        status = 'FINISHED'
    WHERE id = p_match_id;

    -- ── Process each ticket_item for this match ──
    FOR v_item IN
        SELECT ti.*, pt."userId" AS ticket_user_id, pt.status AS ticket_status
        FROM ticket_items ti
        JOIN prediction_tickets pt ON pt.id = ti."predictionTicketId"
        WHERE ti."matchMarketId" = p_match_id
        AND pt.status = 'PENDING'
        FOR UPDATE OF ti
    LOOP
        v_ticket_id := v_item."predictionTicketId";

        -- Skip if already processed in this run
        IF v_ticket_id = ANY(v_processed_tickets) THEN
            CONTINUE;
        END IF;
        v_processed_tickets := array_append(v_processed_tickets, v_ticket_id);

        -- ── Count total items in this ticket ──
        SELECT COUNT(*) INTO v_total_items
        FROM ticket_items
        WHERE "predictionTicketId" = v_ticket_id;

        -- ── Count resolved items (matches that are FINISHED) ──
        SELECT COUNT(*) INTO v_resolved_items
        FROM ticket_items ti2
        JOIN match_markets mm ON mm.id = ti2."matchMarketId"
        WHERE ti2."predictionTicketId" = v_ticket_id
        AND mm.status = 'FINISHED';

        -- ── If not all matches resolved yet, skip ──
        IF v_resolved_items < v_total_items THEN
            CONTINUE;
        END IF;

        -- ── All matches finished — check if ALL correct ──
        SELECT COUNT(*) INTO v_correct_items
        FROM ticket_items ti3
        JOIN match_markets mm2 ON mm2.id = ti3."matchMarketId"
        WHERE ti3."predictionTicketId" = v_ticket_id
        AND ti3."selectedOutcome"::text = mm2.result::text;

        -- ── Get ticket details ──
        SELECT * INTO v_ticket
        FROM prediction_tickets
        WHERE id = v_ticket_id
        FOR UPDATE;

        IF v_correct_items = v_total_items THEN
            -- ═══ ALL CORRECT → HIT! PAY OUT ═══
            v_winners := v_winners + 1;

            UPDATE prediction_tickets
            SET status = 'HIT'
            WHERE id = v_ticket_id;

            -- Pay potential return to user
            UPDATE users
            SET "clCoins" = "clCoins" + v_ticket."potentialReturn"
            WHERE id = v_ticket."userId";

            -- Log winnings transaction
            INSERT INTO transactions (
                "id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt"
            ) VALUES (
                gen_random_uuid()::text,
                v_ticket."userId",
                0,
                v_ticket."potentialReturn",
                'REWARD_REDEMPTION',
                'APPROVED',
                now()
            );

            v_total_paid := v_total_paid + v_ticket."potentialReturn";

            -- ── Update streak ──
            UPDATE users
            SET "currentStreak" = "currentStreak" + 1
            WHERE id = v_ticket."userId";

        ELSE
            -- ═══ AT LEAST ONE WRONG → MISSED ═══
            v_losers := v_losers + 1;

            UPDATE prediction_tickets
            SET status = 'MISSED'
            WHERE id = v_ticket_id;

            -- ── Reset streak ──
            UPDATE users
            SET "currentStreak" = 0
            WHERE id = v_ticket."userId";
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'matchId',    p_match_id,
        'result',     p_result,
        'winners',    v_winners,
        'losers',     v_losers,
        'totalPaid',  ROUND(v_total_paid::NUMERIC, 2),
        'ticketsProcessed', v_winners + v_losers,
        'message',    '✅ Partido liquidado: ' || v_winners || ' ganadores, ' || v_losers || ' perdedores'
    );
END;
$$;


-- ═══════════════════════════════════════════
-- 3. ADD BET_PLACED + WINNINGS_PAID to TransactionType
-- ═══════════════════════════════════════════
-- The enum might not have these values yet.
-- Using DO block to handle "already exists" gracefully

DO $$
BEGIN
    -- Add BET_PLACED if not exists
    BEGIN
        ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BET_PLACED';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- Add WINNINGS_PAID if not exists
    BEGIN
        ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WINNINGS_PAID';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- Add STORE_REDEMPTION if not exists
    BEGIN
        ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STORE_REDEMPTION';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;


-- ═══════════════════════════════════════════
-- 4. VERIFY EVERYTHING
-- ═══════════════════════════════════════════

SELECT 'submit_ticket' AS rpc, 
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='submit_ticket') 
            THEN '✅' ELSE '❌' END AS status
UNION ALL
SELECT 'settle_match_v2', 
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='settle_match_v2') 
            THEN '✅' ELSE '❌' END
UNION ALL
SELECT 'redeem_store_item', 
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='redeem_store_item') 
            THEN '✅' ELSE '❌' END;
