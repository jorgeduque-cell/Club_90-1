-- ============================================
-- CLUB 90+1 — MÓDULO DE CAJERO (Emisión de CL COINS)
-- ============================================
-- Reemplaza el OCR de facturas y el flujo predatorio de "comprar monedas".
-- Flujo legal (PLAN_MUNDIAL §0, §2): el cliente CONSUME producto real → el cajero
-- digita el monto de venta → el sistema emite un código de 6 dígitos (vence 10 min)
-- → el cliente lo canjea en la app y RECIBE sus CL COINS (cashback gamificado).
--
-- Economía (PLAN_MUNDIAL §1):
--   Emisión: 10 COINS por cada 1.000 COP  → coins = floor(montoCOP / 100)
--   Tope:    5.000 COINS por usuario por noche (anti-abuso)
-- ============================================

-- ═══════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════

-- Rol de cajero (hoy: PLAYER, ADMIN)
DO $$
BEGIN
    BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CASHIER'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Tipo de transacción para monedas ganadas por consumo
DO $$
BEGIN
    BEGIN ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'COINS_EARNED'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Estado del código de emisión
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmissionStatus') THEN
        CREATE TYPE "EmissionStatus" AS ENUM ('PENDING', 'REDEEMED', 'EXPIRED');
    END IF;
END $$;


-- ═══════════════════════════════════════════
-- 2. TABLA emission_codes
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "emission_codes" (
    "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code"             TEXT NOT NULL,                 -- 6 dígitos que ve el cliente
    "amountCOP"        DOUBLE PRECISION NOT NULL,     -- monto de venta real digitado por el cajero
    "coinsValue"       DOUBLE PRECISION NOT NULL,     -- CL COINS a acreditar al canjear
    "cashierId"        TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "status"           "EmissionStatus" NOT NULL DEFAULT 'PENDING',
    "redeemedByUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "redeemedAt"       TIMESTAMP(3),
    "expiresAt"        TIMESTAMP(3) NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un solo código PENDING vivo con el mismo valor de 6 dígitos a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS "emission_codes_code_pending_key"
    ON "emission_codes" ("code")
    WHERE "status" = 'PENDING';

CREATE INDEX IF NOT EXISTS "emission_codes_cashierId_idx"   ON "emission_codes" ("cashierId");
CREATE INDEX IF NOT EXISTS "emission_codes_status_idx"      ON "emission_codes" ("status");
CREATE INDEX IF NOT EXISTS "emission_codes_redeemedBy_idx"  ON "emission_codes" ("redeemedByUserId");


-- ═══════════════════════════════════════════
-- 3. RLS — todo el acceso pasa por las RPC (SECURITY DEFINER)
-- ═══════════════════════════════════════════
-- Sin políticas de INSERT/UPDATE/DELETE: la tabla solo se escribe vía RPC.
-- SELECT: el cajero ve sus propios códigos; el admin ve todos.

ALTER TABLE "emission_codes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cashier views own emission codes" ON "emission_codes";
CREATE POLICY "Cashier views own emission codes"
    ON "emission_codes"
    FOR SELECT
    TO authenticated
    USING (
        "cashierId" = auth.uid()::text
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN')
    );


-- ═══════════════════════════════════════════
-- 4. RPC create_emission_code  (CAJERO)
-- ═══════════════════════════════════════════
-- El cajero digita el monto de venta. Genera código de 6 dígitos con vencimiento de
-- 10 min. NO acredita monedas (eso ocurre al canjear, con el cliente presente).

CREATE OR REPLACE FUNCTION create_emission_code(p_amount_cop FLOAT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid        TEXT := auth.uid()::text;
    v_cashier    RECORD;
    v_coins      FLOAT;
    v_code       TEXT;
    v_id         TEXT;
    v_expires    TIMESTAMP(3);
    v_attempts   INT := 0;
    v_max_cop    CONSTANT FLOAT := 10000000;  -- guarda anti fat-finger ($10M COP)
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- Solo CASHIER o ADMIN pueden emitir
    SELECT * INTO v_cashier FROM users WHERE id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    IF v_cashier.role NOT IN ('CASHIER', 'ADMIN') THEN
        RAISE EXCEPTION 'Solo un cajero puede emitir códigos';
    END IF;

    -- Validar monto
    IF p_amount_cop IS NULL OR p_amount_cop <= 0 THEN
        RAISE EXCEPTION 'El monto de venta debe ser mayor a 0';
    END IF;
    IF p_amount_cop > v_max_cop THEN
        RAISE EXCEPTION 'Monto fuera de rango. Verifica la venta.';
    END IF;

    -- Emisión: 10 COINS / 1.000 COP  →  1 COIN = 100 COP
    v_coins := floor(p_amount_cop / 100.0);
    IF v_coins < 1 THEN
        RAISE EXCEPTION 'La venta es muy pequeña para generar CL COINS (mínimo $100 COP)';
    END IF;

    -- Código único de 6 dígitos entre los PENDING vivos
    LOOP
        v_attempts := v_attempts + 1;
        v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM emission_codes
            WHERE code = v_code AND status = 'PENDING'
        );
        IF v_attempts > 20 THEN
            RAISE EXCEPTION 'No se pudo generar un código único, reintenta';
        END IF;
    END LOOP;

    v_id      := gen_random_uuid()::text;
    v_expires := now() + INTERVAL '10 minutes';

    INSERT INTO emission_codes ("id", "code", "amountCOP", "coinsValue", "cashierId", "status", "expiresAt")
    VALUES (v_id, v_code, p_amount_cop, v_coins, v_uid, 'PENDING', v_expires);

    RETURN jsonb_build_object(
        'id',         v_id,
        'code',       v_code,
        'amountCOP',  p_amount_cop,
        'coinsValue', v_coins,
        'expiresAt',  v_expires,
        'message',    '✅ Código generado. El cliente tiene 10 minutos para canjearlo.'
    );
END;
$$;


-- ═══════════════════════════════════════════
-- 5. RPC redeem_emission_code  (CLIENTE)
-- ═══════════════════════════════════════════
-- El cliente digita el código. Valida vivo + no vencido, aplica el tope nocturno,
-- acredita CL COINS, lo vuelve miembro activo (PREMIUM) y registra la transacción.

CREATE OR REPLACE FUNCTION redeem_emission_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid          TEXT := auth.uid()::text;
    v_user         RECORD;
    v_code         RECORD;
    v_earned_today FLOAT;
    v_night_cap    CONSTANT FLOAT := 5000;   -- §1: tope 5.000 COINS/usuario/noche
    v_day_start    TIMESTAMP;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- Normalizar código (solo dígitos)
    p_code := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
    IF length(p_code) <> 6 THEN
        RAISE EXCEPTION 'El código debe tener 6 dígitos';
    END IF;

    -- Bloquear el código vivo
    SELECT * INTO v_code
    FROM emission_codes
    WHERE code = p_code AND status = 'PENDING'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código inválido o ya utilizado';
    END IF;

    -- ¿Vencido? Márcalo y rechaza.
    IF v_code."expiresAt" < now() THEN
        UPDATE emission_codes SET status = 'EXPIRED' WHERE id = v_code.id;
        RAISE EXCEPTION 'El código venció. Pídele al cajero que genere uno nuevo.';
    END IF;

    -- Anti-abuso: el cajero no puede canjear su propio código
    IF v_code."cashierId" = v_uid THEN
        RAISE EXCEPTION 'No puedes canjear un código que tú mismo generaste';
    END IF;

    -- Bloquear usuario
    SELECT * INTO v_user FROM users WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- Tope nocturno: suma de COINS_EARNED desde el inicio del día (America/Bogota)
    v_day_start := date_trunc('day', now() AT TIME ZONE 'America/Bogota');
    SELECT COALESCE(SUM("coinsAdded"), 0) INTO v_earned_today
    FROM transactions
    WHERE "userId" = v_uid
      AND type = 'COINS_EARNED'
      AND ("createdAt" AT TIME ZONE 'America/Bogota') >= v_day_start;

    IF v_earned_today + v_code."coinsValue" > v_night_cap THEN
        RAISE EXCEPTION 'Tope de la noche alcanzado (% CL). Ya ganaste % CL hoy; este código suma %.',
            v_night_cap, v_earned_today, v_code."coinsValue";
    END IF;

    -- Acreditar + volver miembro activo (única vía a PREMIUM en el nuevo modelo)
    UPDATE users
    SET "clCoins"     = "clCoins" + v_code."coinsValue",
        "accountTier" = 'PREMIUM'
    WHERE id = v_uid;

    -- Marcar código como canjeado
    UPDATE emission_codes
    SET status = 'REDEEMED', "redeemedByUserId" = v_uid, "redeemedAt" = now()
    WHERE id = v_code.id;

    -- Registrar transacción (referenceId = emisión, idempotencia + trazabilidad COP→COINS)
    INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "referenceId", "status", "createdAt")
    VALUES (gen_random_uuid()::text, v_uid, v_code."amountCOP", v_code."coinsValue",
            'COINS_EARNED', 'EMISSION:' || v_code.id, 'APPROVED', now());

    RETURN jsonb_build_object(
        'success',    true,
        'coinsAdded', v_code."coinsValue",
        'newBalance', v_user."clCoins" + v_code."coinsValue",
        'message',    '🪙 ¡' || v_code."coinsValue" || ' CL COINS acreditadas! Ya puedes pronosticar.'
    );
END;
$$;


-- ═══════════════════════════════════════════
-- 6. GRANTS
-- ═══════════════════════════════════════════

GRANT EXECUTE ON FUNCTION create_emission_code(FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_emission_code(TEXT)  TO authenticated;

SELECT '✅ Módulo de cajero (emission_codes + RPCs) aplicado' AS status;