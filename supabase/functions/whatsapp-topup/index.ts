// ============================================
// CLUB 90+1 — Edge Function: WhatsApp Top-Up
// ============================================
// Webhook endpoint called by the WhatsApp bot after
// GPT-4 Vision validates a payment receipt.
//
// SECURITY: Requires x-webhook-secret header.
// BLUEPRINT §6: Only accepts $20.000 (Salvavidas) or $50.000 (Pase Premium).
//
// POST /functions/v1/whatsapp-topup
// Headers: x-webhook-secret: <secret>
// Body: { "userPhone": "573001234567", "extractedAmount": 50000, "referenceId": "NEQUI-123" }

import { createAdminClient } from '../_shared/supabase-admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ── Blueprint §6: SKU Fijo ──
const VALID_AMOUNTS: Record<number, { coins: number; type: string }> = {
  50000: { coins: 10_000, type: 'PREMIUM_PASS' },
  20000: { coins: 5_000, type: 'LIFESAVER_TOPUP' },
};

// ── Blueprint §6: Recharge Limits ──
const RECHARGE_MIN_BALANCE = 2_000;
const RECHARGE_WEEKLY_CAP = 2;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── SECURITY: Validate webhook secret ──
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('x-webhook-secret');

    if (!webhookSecret || providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse body ──
    const { userPhone, extractedAmount, referenceId } = await req.json();

    if (!userPhone || typeof userPhone !== 'string' || userPhone.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Número de teléfono inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Blueprint §6: SKU Fijo — Only $20.000 or $50.000 ──
    const sku = VALID_AMOUNTS[extractedAmount];
    if (!sku) {
      return new Response(
        JSON.stringify({ success: false, error: 'Monto inválido. Solo se aceptan $20.000 (Vida Extra) o $50.000 (Pase Premium) COP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Use admin client (this is a server-to-server webhook) ──
    const supabase = createAdminClient();

    // ── Validate referenceId uniqueness (prevent replay attacks) ──
    if (referenceId) {
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('referenceId', referenceId)
        .single();

      if (existingTx) {
        return new Response(
          JSON.stringify({ success: false, error: 'Esta referencia ya fue procesada. Posible duplicado.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Find user by phone ──
    let { data: user } = await supabase
      .from('users')
      .select('id, clCoins, accountTier, storedLifeSavers')
      .eq('phone', userPhone)
      .single();

    // ── If user doesn't exist, create via Auth ──
    if (!user) {
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        phone: userPhone,
        phone_confirm: true,
        user_metadata: {
          name: `Jugador ${userPhone.slice(-4)}`,
        },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Error al crear usuario: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The trigger handle_new_user() auto-creates the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: newUser } = await supabase
        .from('users')
        .select('id, clCoins, accountTier, storedLifeSavers')
        .eq('phone', userPhone)
        .single();

      user = newUser;
    }

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo encontrar o crear el usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Blueprint §6: Business Rules for LIFESAVER_TOPUP ──
    if (sku.type === 'LIFESAVER_TOPUP') {
      // Bankruptcy Rule: balance must be < 2000
      if ((user.clCoins || 0) >= RECHARGE_MIN_BALANCE) {
        return new Response(
          JSON.stringify({ success: false, error: `Saldo actual: ${user.clCoins} CL. Solo puedes recargar con saldo menor a ${RECHARGE_MIN_BALANCE} CL.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Weekly Cap: max 2 per week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('type', 'LIFESAVER_TOPUP')
        .eq('status', 'APPROVED')
        .gte('createdAt', oneWeekAgo);

      if ((count || 0) >= RECHARGE_WEEKLY_CAP) {
        return new Response(
          JSON.stringify({ success: false, error: `Ya usaste tus ${RECHARGE_WEEKLY_CAP} recargas semanales. Intenta la próxima semana.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Blueprint §3: Premium Pass — already premium check ──
    if (sku.type === 'PREMIUM_PASS' && user.accountTier === 'PREMIUM') {
      return new Response(
        JSON.stringify({ success: false, error: 'El usuario ya tiene Pase Premium activo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Credit coins + upgrade tier ──
    const newCoins = (user.clCoins || 0) + sku.coins;
    const updates: Record<string, unknown> = { clCoins: newCoins };

    if (sku.type === 'PREMIUM_PASS') {
      updates.accountTier = 'PREMIUM';
    }

    await supabase.from('users').update(updates).eq('id', user.id);

    // ── Log transaction ──
    await supabase.from('transactions').insert({
      id: crypto.randomUUID(),
      userId: user.id,
      amountCOP: extractedAmount,
      coinsAdded: sku.coins,
      type: sku.type,
      referenceId: referenceId || null,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    });

    // ── Build response message ──
    const tierLabel = sku.type === 'PREMIUM_PASS' ? '⭐ Tier: PREMIUM' : '❤️ Vida Extra';
    const responseMessage = `✅ Transacción exitosa.\n🪙 +${sku.coins.toLocaleString()} CL COINS\n${tierLabel}\n💰 Saldo: ${newCoins.toLocaleString()} CL`;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          userId: user.id,
          coinsAdded: sku.coins,
          newBalance: newCoins,
          type: sku.type,
          message: responseMessage,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('whatsapp-topup error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
