-- ==========================================
-- CLUB 90+1 — STORE REDEMPTION RPC
-- ==========================================

CREATE OR REPLACE FUNCTION redeem_store_item(
    p_user_id TEXT,
    p_store_item_id TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    qr_code_string TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_item RECORD;
    v_qr TEXT;
BEGIN
    -- 1. Obtener usuario con bloqueo concurrente
    SELECT * INTO v_user
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Usuario no encontrado.';
        RETURN;
    END IF;

    -- Validar Tier
    IF v_user."accountTier" != 'PREMIUM' THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'Debes tener PASE PREMIUM para el kiosco.';
        RETURN;
    END IF;

    -- 2. Obtener Item
    SELECT * INTO v_item
    FROM store_items
    WHERE id = p_store_item_id AND "isActive" = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'El producto no existe o está inactivo.';
        RETURN;
    END IF;

    -- 3. Validar balance
    IF v_user."clCoins" < v_item."costInCoins" THEN
        RETURN QUERY SELECT false, NULL::TEXT, 'No tienes suficientes CL COINS.';
        RETURN;
    END IF;

    -- 4. Restar monedas
    UPDATE users
    SET "clCoins" = "clCoins" - v_item."costInCoins"
    WHERE id = p_user_id;

    -- 5. Generar QR Code Unico (Formato: C90-ITEMID-RANDOM)
    v_qr := 'C90-' || substr(p_store_item_id, 1, 6) || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- 6. Insertar ticket de redención
    INSERT INTO redemption_tickets (
        "id", "userId", "storeItemId", "qrCodeString", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text,
        p_user_id,
        p_store_item_id,
        v_qr,
        'PENDING',
        now()
    );

    -- 7. Registrar transacción en historial
    INSERT INTO transactions (
        "id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text,
        p_user_id,
        0,
        -(v_item."costInCoins"), -- Registro negativo
        'REWARD_REDEMPTION',
        'APPROVED',
        now()
    );

    -- Retornar éxito
    RETURN QUERY SELECT true, v_qr, 'Canje exitoso';

END;
$$;
