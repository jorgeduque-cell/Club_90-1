// ============================================
// CLUB 90+1 — Shared CORS Headers (Production)
// ============================================
// S4 FIX: Restrict origin to production domain.
// Set ALLOWED_ORIGIN env var in Supabase Dashboard.
// Fallback to Vercel domain if not set.

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://club90.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
