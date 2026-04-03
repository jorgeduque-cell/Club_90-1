// ============================================
// CLUB 90 — GPT-4o Vision Receipt Analyzer
// ============================================
// Sends payment receipt images to OpenAI GPT-4o
// and extracts: amount (COP), reference ID, and
// payer name for automated top-up processing.

import OpenAI from 'openai';
import { ENV } from './config.js';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

// ── Analysis Result Type ──
export interface ReceiptAnalysis {
  success: boolean;
  amount: number | null;       // e.g. 20000 or 50000
  referenceId: string | null;  // e.g. "NEQUI-ABC123"
  payerName: string | null;    // e.g. "Jorge Duque"
  rawText: string;             // GPT's explanation
  error?: string;
}

// ── Valid amounts per Blueprint §6 ──
const VALID_AMOUNTS = [20000, 50000];

// ── System Prompt (Spanish, strict) ──
const SYSTEM_PROMPT = `Eres un verificador de comprobantes de pago para Club 90+1, una plataforma de pronósticos deportivos.

Tu tarea es analizar la imagen del comprobante y extraer EXACTAMENTE:
1. **monto**: El monto total en COP (pesos colombianos). Solo acepta $20.000 o $50.000.
2. **referencia**: El número de referencia, transacción, o comprobante.
3. **nombre**: El nombre del pagador (quien envía el dinero).

REGLAS ESTRICTAS:
- Si el monto NO es exactamente $20.000 o $50.000, reporta error.
- Si no puedes leer la imagen claramente, reporta error.
- Si parece un comprobante falso o editado, reporta error.
- Los comprobantes válidos son de: Nequi, Daviplata, Bancolombia, Nequi Empresas.

Responde SIEMPRE en este formato JSON exacto (sin markdown):
{
  "amount": 20000,
  "referenceId": "NEQUI-ABC123",
  "payerName": "Jorge Duque",
  "isValid": true,
  "reason": "Comprobante Nequi válido por $20.000"
}

Si hay error:
{
  "amount": null,
  "referenceId": null,
  "payerName": null,
  "isValid": false,
  "reason": "No se puede leer el monto en la imagen"
}`;

/**
 * Analyzes a payment receipt image using GPT-4o Vision.
 * @param imageBuffer - Raw image bytes (JPEG/PNG)
 * @returns Structured analysis result
 */
export async function analyzeReceipt(imageBuffer: Buffer): Promise<ReceiptAnalysis> {
  try {
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza este comprobante de pago:' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON from GPT response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        amount: null,
        referenceId: null,
        payerName: null,
        rawText: content,
        error: 'GPT no retornó JSON válido',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate amount is one of the accepted values
    if (!parsed.isValid || !VALID_AMOUNTS.includes(parsed.amount)) {
      return {
        success: false,
        amount: parsed.amount,
        referenceId: parsed.referenceId,
        payerName: parsed.payerName,
        rawText: parsed.reason || content,
        error: parsed.reason || 'Monto inválido. Solo se acepta $20.000 o $50.000 COP.',
      };
    }

    return {
      success: true,
      amount: parsed.amount,
      referenceId: parsed.referenceId || `AUTO-${Date.now()}`,
      payerName: parsed.payerName,
      rawText: parsed.reason || 'Comprobante válido',
    };
  } catch (err: any) {
    console.error('❌ [ReceiptAnalyzer] OpenAI error:', err.message);
    return {
      success: false,
      amount: null,
      referenceId: null,
      payerName: null,
      rawText: '',
      error: `Error al analizar imagen: ${err.message}`,
    };
  }
}

/**
 * Detect MIME type from buffer magic bytes.
 */
function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg'; // fallback
}
