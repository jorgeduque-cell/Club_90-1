-- ============================================
-- CLUB PYP — Suscripciones de Web Push
-- ============================================
-- Guarda la suscripción push de cada dispositivo del usuario. La Edge Function
-- `send-push` lee de aquí para enviar notificaciones (partido por empezar,
-- monedas por vencer, subió de estatus, etc.).
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "endpoint"  TEXT NOT NULL UNIQUE,
    "p256dh"    TEXT NOT NULL,
    "auth"      TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON push_subscriptions ("userId");

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El usuario solo ve sus propias suscripciones; las escrituras van por RPC.
DROP POLICY IF EXISTS "Users view own push subs" ON push_subscriptions;
CREATE POLICY "Users view own push subs"
    ON push_subscriptions FOR SELECT TO authenticated
    USING ("userId" = auth.uid()::text);

-- ── RPC: guardar/actualizar suscripción (upsert por endpoint) ──
CREATE OR REPLACE FUNCTION save_push_subscription(
    p_endpoint TEXT,
    p_p256dh   TEXT,
    p_auth     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid TEXT := auth.uid()::text;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_endpoint IS NULL OR p_p256dh IS NULL OR p_auth IS NULL THEN
        RAISE EXCEPTION 'Datos de suscripción incompletos';
    END IF;

    INSERT INTO push_subscriptions ("userId", "endpoint", "p256dh", "auth")
    VALUES (v_uid, p_endpoint, p_p256dh, p_auth)
    ON CONFLICT ("endpoint") DO UPDATE
        SET "userId" = v_uid, "p256dh" = p_p256dh, "auth" = p_auth;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── RPC: borrar suscripción del dispositivo ──
CREATE OR REPLACE FUNCTION delete_push_subscription(p_endpoint TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid TEXT := auth.uid()::text;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    DELETE FROM push_subscriptions WHERE "endpoint" = p_endpoint AND "userId" = v_uid;
    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION save_push_subscription(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_push_subscription(TEXT) TO authenticated;

SELECT '✅ push_subscriptions + RPCs aplicados' AS status;