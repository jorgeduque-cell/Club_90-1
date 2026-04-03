-- ============================================
-- CLUB 90+1 — Security Hardening Migration
-- ============================================
-- Fixes: IDOR in RPCs + ticket_items RLS tightening
-- Run in Supabase SQL Editor
-- ============================================

-- ═══════════════════════════════════════════
-- FIX #2: redeem_store_item — use auth.uid()
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION redeem_store_item(p_store_item_id TEXT)
RETURNS TABLE (
    success BOOLEAN,
    qr_code_string TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid  TEXT := auth.uid()::text;
    v_user RECORD;
    v_item RECORD;
    v_qr   TEXT;
BEGIN
    -- Validate caller is authenticated
    IF v_uid IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'No autenticado.';
        RETURN;
    END IF;

    -- 1. Get user with row lock (prevents double-redeem)
    SELECT * INTO v_user
    FROM users
    WHERE id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Usuario no encontrado.';
        RETURN;
    END IF;

    IF v_user."accountTier" != 'PREMIUM' THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Debes tener PASE PREMIUM para el kiosco.';
        RETURN;
    END IF;

    -- 2. Get item
    SELECT * INTO v_item
    FROM store_items
    WHERE id = p_store_item_id AND "isActive" = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'El producto no existe o está inactivo.';
        RETURN;
    END IF;

    -- 3. Validate balance
    IF v_user."clCoins" < v_item."costInCoins" THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'No tienes suficientes CL COINS.';
        RETURN;
    END IF;

    -- 4. Deduct coins
    UPDATE users
    SET "clCoins" = "clCoins" - v_item."costInCoins"
    WHERE id = v_uid;

    -- 5. Generate unique QR code
    v_qr := 'C90-' || substr(p_store_item_id, 1, 6) || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- 6. Insert redemption ticket
    INSERT INTO redemption_tickets (
        "id", "userId", "storeItemId", "qrCodeString", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text, v_uid, p_store_item_id, v_qr, 'PENDING', now()
    );

    -- 7. Log transaction
    INSERT INTO transactions (
        "id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text, v_uid, 0, -(v_item."costInCoins"),
        'REWARD_REDEMPTION', 'APPROVED', now()
    );

    RETURN QUERY SELECT true, v_qr, 'Canje exitoso';
END;
$$;


-- ═══════════════════════════════════════════
-- FIX #6: ticket_items — restrict to owner
-- ═══════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can view ticket items" ON public.ticket_items;

CREATE POLICY "Users can view own ticket items" 
ON public.ticket_items 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM prediction_tickets pt
        WHERE pt.id = ticket_items."predictionTicketId"
        AND pt."userId" = auth.uid()::text
    )
);


-- ═══════════════════════════════════════════
-- FIX #7: submit_ticket — use auth.uid()
-- ═══════════════════════════════════════════
-- NOTE: Only fix if submit_ticket RPC exists and accepts p_user_id.
-- If it already uses auth.uid(), skip this.

DO $$
BEGIN
    -- Check if function exists with the old signature
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'submit_ticket' 
        AND pronargs >= 3
    ) THEN
        RAISE NOTICE 'submit_ticket exists with 3+ args — needs manual refactor to use auth.uid()';
    END IF;
END $$;
