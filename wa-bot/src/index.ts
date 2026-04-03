// ============================================
// CLUB 90 — WhatsApp Bot Entry Point (Baileys)
// ============================================
// Connects to WhatsApp via WebSocket, displays
// a QR code for authentication, and routes all
// incoming messages to the handler.
//
// Auth state is persisted to ./auth_store/ so
// you only need to scan QR once.

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { createRequire } from 'module';
import { handleMessage } from './messageHandler.js';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-terminal');

// Import config to validate env at startup
import './config.js';

// ── Logger (minimal output for production) ──
const logger = pino({ level: 'warn' });

// ── Auth Store Directory ──
const AUTH_DIR = './auth_store';

/**
 * Starts the WhatsApp bot connection.
 */
async function startBot(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🏆 CLUB 90+1 — WhatsApp Bot       ║');
  console.log('║   Powered by Baileys + GPT-4o        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // Load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📡 Using WA version: ${version.join('.')}`);

  // Create socket
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false, // We handle QR manually
    browser: ['Club90Bot', 'Chrome', '22.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  // ── QR Code Display ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('');
      console.log('📱 Escanea este QR con tu WhatsApp:');
      console.log('   (Ajustes → Dispositivos vinculados → Vincular un dispositivo)');
      console.log('');
      qrcode.generate(qr, { small: true });
      console.log('');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexión cerrada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);

      if (shouldReconnect) {
        // Exponential backoff before reconnect
        await sleep(3000);
        await startBot();
      } else {
        console.log('🚪 Sesión cerrada. Elimina ./auth_store/ y reinicia para vincular de nuevo.');
      }
    }

    if (connection === 'open') {
      console.log('');
      console.log('✅ ¡Bot conectado exitosamente a WhatsApp!');
      console.log('🤖 Esperando mensajes...');
      console.log('');
    }
  });

  // ── Save credentials on update ──
  sock.ev.on('creds.update', saveCreds);

  // ── Message Handler ──
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process new messages (not history sync)
    if (type !== 'notify') return;

    for (const message of messages) {
      // Skip own messages
      if (message.key.fromMe) continue;

      // Skip group messages (bot only works in private chats)
      if (message.key.remoteJid?.endsWith('@g.us')) continue;

      try {
        await handleMessage(sock, message);
      } catch (err) {
        console.error('❌ [Bot] Error handling message:', err);
      }
    }
  });
}

/**
 * Helper: sleep for ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Start ──
startBot().catch((err) => {
  console.error('💀 Fatal error starting bot:', err);
  process.exit(1);
});
