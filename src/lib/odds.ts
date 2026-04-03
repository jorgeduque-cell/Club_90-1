// ============================================
// CLUB 90 — Client-Side Multiplier Calculator
// ============================================
// ⚠️ DEMO-ONLY MODULE — Not used in production.
// In production, multipliers are calculated server-side
// in PL/pgSQL (match_markets.multiplierHome/Draw/Away).
//
// NOTE: Internal variable names still use "odd" for
// mathematical accuracy (these are Pari-Mutuel decimal odds).
// User-facing UI uses "multiplicador" per Blueprint §2.
//
// Pure TypeScript function for calculating live
// Pari-Mutuel multipliers on the client side.
// Used by BetSlip to show "Retorno Estimado" in real-time
// without making a server round-trip.

/**
 * House margin: 20% commission.
 */
export const HOUSE_MARGIN = 0.20;

/**
 * Seed liquidity per pool option (CL COINS).
 */
export const SEED_LIQUIDITY = 10_000;

/**
 * Minimum allowed odd (prevents sub-even payouts).
 */
const MIN_ODD = 1.05;

export interface LiveOdds {
  home: number;
  draw: number;
  away: number;
}

/**
 * Calculates live Pari-Mutuel decimal odds.
 * Mirror of the PL/pgSQL calculate_live_odds() function.
 *
 * @param homePool - Real CL COINS in home pool
 * @param drawPool - Real CL COINS in draw pool
 * @param awayPool - Real CL COINS in away pool
 * @returns Decimal odds for each outcome
 */
export function calculateLiveOdds(
  homePool: number,
  drawPool: number,
  awayPool: number
): LiveOdds {
  const seededHome = homePool + SEED_LIQUIDITY;
  const seededDraw = drawPool + SEED_LIQUIDITY;
  const seededAway = awayPool + SEED_LIQUIDITY;

  const grossPool = seededHome + seededDraw + seededAway;
  const netPool = grossPool * (1 - HOUSE_MARGIN);

  return {
    home: roundOdd(Math.max(MIN_ODD, netPool / seededHome)),
    draw: roundOdd(Math.max(MIN_ODD, netPool / seededDraw)),
    away: roundOdd(Math.max(MIN_ODD, netPool / seededAway)),
  };
}

/**
 * Calculates the estimated return for a bet.
 *
 * @param amount - CL COINS bet amount
 * @param odd - Decimal odd for the selected prediction
 * @returns Estimated return in CL COINS
 */
export function calculateEstimatedReturn(amount: number, odd: number): number {
  return Math.round(amount * odd * 100) / 100;
}

/**
 * Rounds to 2 decimal places with epsilon-safe precision.
 */
function roundOdd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Maps a prediction key to the odds object key.
 */
export function getOddForPrediction(
  odds: LiveOdds,
  prediction: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN'
): number {
  const map: Record<string, keyof LiveOdds> = {
    HOME_WIN: 'home',
    DRAW: 'draw',
    AWAY_WIN: 'away',
  };
  return odds[map[prediction]];
}
