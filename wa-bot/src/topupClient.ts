// ============================================
// CLUB 90 — Top-Up Client (Edge Function Caller)
// ============================================
// Calls the Supabase whatsapp-topup Edge Function
// to credit CL COINS to a user's account.

import { ENV } from './config.js';

// ── Response from Edge Function ──
export interface TopUpResult {
  success: boolean;
  data?: {
    userId: string;
    coinsAdded: number;
    newBalance: number;
    type: string;
    message: string;
  };
  error?: string;
}

/**
 * Calls the whatsapp-topup Edge Function to credit coins.
 * @param userPhone - User's phone number (e.g. "573001234567")
 * @param extractedAmount - Amount in COP (20000 or 50000)
 * @param referenceId - Payment reference ID
 * @returns TopUpResult with success/error
 */
export async function processTopUp(
  userPhone: string,
  extractedAmount: number,
  referenceId: string,
): Promise<TopUpResult> {
  try {
    const url = `${ENV.SUPABASE_FUNCTIONS_URL}/whatsapp-topup`;

    console.log(`📤 [TopUp] Calling Edge Function for ${userPhone} — $${extractedAmount.toLocaleString()} COP`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': ENV.WHATSAPP_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        userPhone,
        extractedAmount,
        referenceId,
      }),
    });

    const data = await response.json() as TopUpResult;

    if (!response.ok) {
      console.error(`❌ [TopUp] Server error ${response.status}:`, data.error);
      return {
        success: false,
        error: data.error || `Error del servidor (${response.status})`,
      };
    }

    console.log(`✅ [TopUp] Success: +${data.data?.coinsAdded} CL for ${userPhone}`);
    return data;
  } catch (err: any) {
    console.error('❌ [TopUp] Network error:', err.message);
    return {
      success: false,
      error: `Error de conexión: ${err.message}`,
    };
  }
}
