// ============================================
// CLUB 90+1 — Edge Function: Sync Odds (POLLER)  ⚠️ DISEÑADO, NO CONECTADO
// ============================================
// PLAN_MUNDIAL §7 — Motor de cuotas automático.
//
// Cada 3 h (cron de Supabase) jala fixtures + odds pre-match de API-Football dentro
// de la ventana de 14 días, NORMALIZA las cuotas (quita el margen del bookmaker y
// aplica overround objetivo 1.20) y rellena multiplierHome/Draw/Away en match_markets.
// Si un fixture no trae odds → el mercado queda en NEEDS_REVIEW (no se abre con
// números malos). La liquidación va por otra función con el resultado de fixtures.
//
// ⚠️ NO CONECTADO: el plan PRO de API-Football aún no está activo y no hay API key.
// Mientras `APIFOOTBALL_KEY` no exista en el entorno, la función NO llama a la API
// (sale temprano). La matemática de normalización SÍ está implementada y es testeable.
//
// Para activar: definir secrets APIFOOTBALL_KEY (+ APIFOOTBALL_LEAGUE_ID, _SEASON,
// _BOOKMAKER_ID) y programar el cron. Ver §7 del plan.

import { createAdminClient } from '../_shared/supabase-admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ── Parámetros de negocio (PLAN_MUNDIAL §1, §7) ──
const TARGET_OVERROUND = 1.20;   // 20% de margen de casa (el rake vive aquí)
const MAX_MULTIPLIER = 5.00;
const MIN_MULTIPLIER = 1.05;
const WINDOW_DAYS = 14;          // las odds pre-match solo existen 1–14 días antes

type Outcome = 'home' | 'draw' | 'away';
type Multipliers = Record<Outcome, number>;

/**
 * Convierte las cuotas decimales 1X2 de un bookmaker en multiplicadores de la casa.
 *
 * Paso 1: prob. justa  p_i = (1/odd_i) / Σ(1/odd_j)   ← quita el margen del bookmaker
 * Paso 2: multiplicador m_i = 1 / (p_i × OVERROUND)    ← deja overround objetivo = 1.20
 * Paso 3: cap 5.00 / piso 1.05 (rompen el 1.20 exacto en extremos; el tope manda).
 *
 * Es PURA y determinista: se puede testear sin tocar la API.
 */
export function normalizeOdds(homeOdd: number, drawOdd: number, awayOdd: number): Multipliers {
  if (homeOdd <= 1 || drawOdd <= 1 || awayOdd <= 1) {
    throw new Error('Cuotas inválidas del bookmaker');
  }
  const invHome = 1 / homeOdd;
  const invDraw = 1 / drawOdd;
  const invAway = 1 / awayOdd;
  const invSum = invHome + invDraw + invAway; // ≈ 1.05–1.08 (margen del bookmaker)

  const fair = {
    home: invHome / invSum,
    draw: invDraw / invSum,
    away: invAway / invSum,
  };

  const clamp = (m: number) => Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, Math.round(m * 100) / 100));

  return {
    home: clamp(1 / (fair.home * TARGET_OVERROUND)),
    draw: clamp(1 / (fair.draw * TARGET_OVERROUND)),
    away: clamp(1 / (fair.away * TARGET_OVERROUND)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('APIFOOTBALL_KEY');

  // ⚠️ Guard de "no conectado": sin key, no se llama a la API.
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        skipped: true,
        reason: 'APIFOOTBALL_KEY no configurada — poller diseñado, aún no conectado (PLAN_MUNDIAL §7).',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const adminClient = createAdminClient();
    const leagueId = Deno.env.get('APIFOOTBALL_LEAGUE_ID');   // p.ej. Mundial 2026
    const season = Deno.env.get('APIFOOTBALL_SEASON');        // p.ej. "2026"
    const bookmakerId = Deno.env.get('APIFOOTBALL_BOOKMAKER_ID'); // /odds/bookmakers
    const BET_MATCH_WINNER = '1'; // "Match Winner" (1X2) — confirmar en /odds/bets

    // ── 1. Fixtures dentro de la ventana de 14 días ──
    // TODO[activar]: GET https://v3.football.api-sports.io/fixtures?league={leagueId}&season={season}
    //   &from={hoy}&to={hoy+14d}  con header { 'x-apisports-key': apiKey }
    //   Mapear cada fixture.teams.home/away.id ↔ real_teams.id (tabla de mapeo del cliente).

    // ── 2. Por cada fixture, odds pre-match del bookmaker elegido ──
    // TODO[activar]: GET /odds?fixture={id}&bookmaker={bookmakerId}&bet={BET_MATCH_WINNER}
    //   Extraer las 3 cuotas (Home/Draw/Away) → normalizeOdds(...) → multiplicadores.
    //   Si no hay odds para el fixture → upsert match_markets con status 'NEEDS_REVIEW'.
    //   Si hay → upsert con multiplierHome/Draw/Away y status 'OPEN' (si aún no inició).

    void adminClient; void leagueId; void season; void bookmakerId; void BET_MATCH_WINNER; void WINDOW_DAYS;

    return new Response(
      JSON.stringify({
        success: true,
        note: 'Esqueleto del poller. Lógica de fetch marcada como TODO[activar]; falta la tabla de mapeo equipo↔real_teams y los IDs de liga/temporada/bookmaker del cliente.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del poller' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});