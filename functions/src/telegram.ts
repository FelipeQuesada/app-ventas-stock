import { logger } from 'firebase-functions';

const TELEGRAM_CHAT_ID = '-5524760869';

export async function sendTelegramMessage(token: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }),
  });

  const body = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) {
    logger.error('Telegram sendMessage falló', {
      status: response.status,
      description: body.description,
    });
    throw new Error(body.description ?? `Telegram HTTP ${response.status}`);
  }
}
