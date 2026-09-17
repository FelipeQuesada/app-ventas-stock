import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { buildCajaCierreText, buildCajaRetiroText } from './cajaMessages';
import { buildSaleGroupTextFromDoc } from './saleGroupText';
import { sendTelegramMessage } from './telegram';

initializeApp();

/** Token de BotFather — setear con: firebase functions:secrets:set TELEGRAM_BOT_TOKEN */
const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');

const functionOpts = {
  region: 'southamerica-east1' as const,
  secrets: [telegramBotToken],
};

export const onSaleCreatedNotifyTelegram = onDocumentCreated(
  {
    ...functionOpts,
    document: 'sales/{saleId}',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn('onSaleCreatedNotifyTelegram: sin snapshot');
      return;
    }

    const data = snap.data();
    if (data.recordType === 'presupuesto') {
      logger.info('Omitiendo presupuesto', { saleId: event.params.saleId });
      return;
    }

    await sendTelegramMessage(telegramBotToken.value(), buildSaleGroupTextFromDoc(data));
    logger.info('Venta notificada a Telegram', { saleId: event.params.saleId });
  }
);

/**
 * Cierre de caja y retiros.
 * Solo dispara si el cliente setea telegramEventId (saveCaja / withdraw).
 * Así no avisa al guardar solo el fondo de cambio.
 */
export const onCajaWrittenNotifyTelegram = onDocumentWritten(
  {
    ...functionOpts,
    document: 'caja/{cajaId}',
  },
  async (event) => {
    const cajaId = event.params.cajaId;
    if (cajaId === '_central') return;

    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data();
    if (!data) return;

    const eventId = typeof data.telegramEventId === 'string' ? data.telegramEventId : '';
    if (!eventId) return;

    const before = event.data?.before;
    const beforeData = before?.exists ? before.data() : undefined;
    const prevEventId =
      beforeData && typeof beforeData.telegramEventId === 'string'
        ? beforeData.telegramEventId
        : '';
    if (prevEventId === eventId) return;

    const text =
      data.entryType === 'retiro' ? buildCajaRetiroText(data) : buildCajaCierreText(data);

    await sendTelegramMessage(telegramBotToken.value(), text);
    logger.info('Caja notificada a Telegram', {
      cajaId,
      entryType: data.entryType === 'retiro' ? 'retiro' : 'cierre',
      eventId,
    });
  }
);
