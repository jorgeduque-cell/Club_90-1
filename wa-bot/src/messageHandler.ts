// ============================================
// CLUB 90 — Message Handler (Conversation Flow)
// ============================================
// Handles incoming WhatsApp messages:
// - Text: Welcome message + instructions
// - Image: Receipt analysis → Confirmation → TopUp
// - Confirmation: Process payment

import type { WASocket, WAMessage, DownloadableMessage } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { analyzeReceipt, type ReceiptAnalysis } from './receiptAnalyzer.js';
import { processTopUp } from './topupClient.js';

// ── Pending Confirmations (in-memory state) ──
interface PendingTopUp {
  amount: number;
  referenceId: string;
  payerName: string | null;
  timestamp: number;
}

// Map of phone → pending top-up (awaiting "SÍ" confirmation)
const pendingConfirmations = new Map<string, PendingTopUp>();

// Auto-expire after 5 minutes
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

// ── Welcome Message ──
const WELCOME_MSG = `🏆 *¡Bienvenido a Club 90+1!*

Para recargar tus CL COINS, envíame una *foto clara* del comprobante de tu pago.

💰 *$20.000 COP* → 5,000 🪙 (Vida Extra)
⭐ *$50.000 COP* → 10,000 🪙 + Pase PREMIUM

📱 Métodos aceptados: *Nequi, Daviplata, Bancolombia*

_Envía tu comprobante para comenzar_ 👇`;

// ── SKU Labels ──
const SKU_LABELS: Record<number, string> = {
  20000: '❤️ Vida Extra (5,000 🪙)',
  50000: '⭐ Pase Premium (10,000 🪙)',
};

/**
 * Main handler for all incoming messages.
 */
export async function handleMessage(sock: WASocket, message: WAMessage): Promise<void> {
  const jid = message.key.remoteJid;
  if (!jid || jid === 'status@broadcast') return;

  // Extract phone number (remove @s.whatsapp.net)
  const phone = jid.replace('@s.whatsapp.net', '');

  // ── Check if it's a image message ──
  const imageMessage = message.message?.imageMessage
    || message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

  if (imageMessage) {
    await handleImageMessage(sock, jid, phone, message);
    return;
  }

  // ── Check if it's a text message ──
  const text = (
    message.message?.conversation
    || message.message?.extendedTextMessage?.text
    || ''
  ).trim();

  if (!text) return;

  // ── Check for pending confirmation ──
  const pending = pendingConfirmations.get(phone);
  if (pending) {
    // Check expiration
    if (Date.now() - pending.timestamp > CONFIRMATION_TTL_MS) {
      pendingConfirmations.delete(phone);
      await sendText(sock, jid, '⏰ La confirmación expiró. Envía el comprobante de nuevo.');
      return;
    }

    const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // User confirms
    if (['si', 'sí', 'yes', 'confirmar', 'dale', 'ok'].includes(normalizedText)) {
      await handleConfirmation(sock, jid, phone, pending);
      return;
    }

    // User provides a different phone number
    if (/^\d{10,15}$/.test(text)) {
      await handleConfirmation(sock, jid, text, pending);
      return;
    }

    // User cancels
    if (['no', 'cancelar', 'cancel'].includes(normalizedText)) {
      pendingConfirmations.delete(phone);
      await sendText(sock, jid, '❌ Recarga cancelada. Envía otro comprobante cuando quieras.');
      return;
    }

    // Unknown response
    await sendText(sock, jid, '🤔 Responde *SÍ* para confirmar, envía tu *número de teléfono* registrado, o *NO* para cancelar.');
    return;
  }

  // ── Default: Welcome message ──
  await sendText(sock, jid, WELCOME_MSG);
}

/**
 * Handles image messages (receipt photos).
 */
async function handleImageMessage(
  sock: WASocket,
  jid: string,
  phone: string,
  message: WAMessage,
): Promise<void> {
  // Step 1: Acknowledge
  await sendText(sock, jid, '🔍 *Analizando tu comprobante...* Esto toma unos segundos.');

  try {
    // Step 2: Download image
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
    ) as Buffer;

    if (!buffer || buffer.length < 1000) {
      await sendText(sock, jid, '❌ No pude descargar la imagen. Intenta enviarla de nuevo como foto (no como archivo).');
      return;
    }

    // Step 3: Analyze with GPT-4 Vision
    const analysis: ReceiptAnalysis = await analyzeReceipt(buffer);

    if (!analysis.success || !analysis.amount) {
      await sendText(sock, jid, `❌ *No se pudo verificar el comprobante*\n\n${analysis.error || analysis.rawText}\n\n_Asegúrate de enviar una foto clara del comprobante Nequi o Daviplata._`);
      return;
    }

    // Step 4: Ask for confirmation
    const skuLabel = SKU_LABELS[analysis.amount] || `$${analysis.amount.toLocaleString()} COP`;

    pendingConfirmations.set(phone, {
      amount: analysis.amount,
      referenceId: analysis.referenceId!,
      payerName: analysis.payerName,
      timestamp: Date.now(),
    });

    await sendText(sock, jid,
      `✅ *Comprobante verificado*\n\n`
      + `💰 Monto: *$${analysis.amount.toLocaleString()} COP*\n`
      + `📦 Paquete: *${skuLabel}*\n`
      + `📋 Ref: \`${analysis.referenceId}\`\n`
      + (analysis.payerName ? `👤 Pagador: ${analysis.payerName}\n` : '')
      + `\n¿Tu número registrado en Club 90 es *${phone}*?\n\n`
      + `👉 Responde *SÍ* para confirmar\n`
      + `👉 O envía tu *número* de Club 90\n`
      + `👉 Responde *NO* para cancelar`
    );
  } catch (err: any) {
    console.error('❌ [Handler] Image processing error:', err);
    await sendText(sock, jid, '❌ Error al procesar la imagen. Intenta de nuevo.');
  }
}

/**
 * Processes a confirmed top-up.
 */
async function handleConfirmation(
  sock: WASocket,
  jid: string,
  targetPhone: string,
  pending: PendingTopUp,
): Promise<void> {
  pendingConfirmations.delete(jid.replace('@s.whatsapp.net', ''));

  await sendText(sock, jid, '⏳ *Procesando tu recarga...* Un momento.');

  const result = await processTopUp(targetPhone, pending.amount, pending.referenceId);

  if (result.success && result.data) {
    await sendText(sock, jid,
      `🎉 *¡Recarga exitosa!*\n\n`
      + `${result.data.message}\n\n`
      + `Abre Club 90 para ver tu nuevo saldo. ¡Buena suerte con tus pronósticos! ⚽🏆`
    );
  } else {
    await sendText(sock, jid,
      `❌ *Error al procesar la recarga*\n\n`
      + `${result.error}\n\n`
      + `_Si crees que es un error, contacta al administrador._`
    );
  }
}

/**
 * Helper: Send a text message.
 */
async function sendText(sock: WASocket, jid: string, text: string): Promise<void> {
  await sock.sendMessage(jid, { text });
}
