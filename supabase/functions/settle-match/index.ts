// ============================================
// CLUB 90 — Edge Function: Settle Match
// ============================================
// Admin-only endpoint to settle a match with final result.
// Calls the PL/pgSQL settle_match_v2() function which handles
// commission extraction and prize distribution atomically.
//
// POST /functions/v1/settle-match
// Headers: Authorization: Bearer <admin_jwt>
// Body: { "matchId": "uuid", "result": "HOME_WIN|DRAW|AWAY_WIN" }

import { createUserClient, createAdminClient } from '../_shared/supabase-admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Extract auth header ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticación requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Verify user is ADMIN ──
    const userClient = createUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: profile } = await userClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ success: false, error: 'Acceso denegado. Se requiere rol ADMIN.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse body ──
    const { matchId, result } = await req.json();

    if (!matchId || !result) {
      return new Response(
        JSON.stringify({ success: false, error: 'matchId y result son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['HOME_WIN', 'DRAW', 'AWAY_WIN'].includes(result)) {
      return new Response(
        JSON.stringify({ success: false, error: 'result debe ser HOME_WIN, DRAW o AWAY_WIN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Call PL/pgSQL function (uses admin client to bypass RLS) ──
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('settle_match_v2', {
      p_match_id: matchId,
      p_result: result,
    });

    if (error) {
      const status = error.message.includes('no encontrado') ? 404 : 400;
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
