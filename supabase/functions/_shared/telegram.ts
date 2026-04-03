// ============================================
// CLUB 90 — Telegram API Helper (Edge Functions)
// ============================================

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken(): string {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  return token;
}

function getAdminChatId(): number {
  const id = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');
  if (!id) throw new Error('Missing TELEGRAM_ADMIN_CHAT_ID');
  return parseInt(id, 10);
}

/**
 * Validates that the message comes from the authorized admin.
 */
export function isAuthorizedAdmin(chatId: number): boolean {
  try {
    return chatId === getAdminChatId();
  } catch {
    return false;
  }
}

/**
 * Send a text message to a Telegram chat.
 */
export async function sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  const res = await fetch(`${TELEGRAM_API}${getToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });
  return res.json();
}

/**
 * Send a message with inline keyboard buttons.
 */
export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  buttons: { text: string; callback_data: string }[][],
) {
  const res = await fetch(`${TELEGRAM_API}${getToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }),
  });
  return res.json();
}

/**
 * Answer a callback query (removes loading spinner on button press).
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}${getToken()}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

/**
 * Download a file from Telegram servers by file_id.
 * Returns the file as an ArrayBuffer + its file path.
 */
export async function downloadTelegramFile(fileId: string): Promise<{ buffer: ArrayBuffer; filePath: string }> {
  // Step 1: Get file path from Telegram
  const fileRes = await fetch(`${TELEGRAM_API}${getToken()}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const fileData = await fileRes.json();

  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('No se pudo obtener el archivo de Telegram');
  }

  const filePath = fileData.result.file_path as string;

  // Step 2: Download the actual file
  const downloadUrl = `https://api.telegram.org/file/bot${getToken()}/${filePath}`;
  const downloadRes = await fetch(downloadUrl);

  if (!downloadRes.ok) {
    throw new Error('No se pudo descargar el archivo');
  }

  return {
    buffer: await downloadRes.arrayBuffer(),
    filePath,
  };
}
