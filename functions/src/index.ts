import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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

function argentinaDateId(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

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
 * Dispara si cambia telegramEventId, o si es un cierre explícito (entryType === 'cierre')
 * con cambios de totales — cubre clientes viejos sin telegramEventId.
 * No avisa al solo actualizar el fondo de cambio (persistCajaCambio no setea entryType).
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

    const before = event.data?.before;
    const beforeData = before?.exists ? before.data() : undefined;

    const eventId = typeof data.telegramEventId === 'string' ? data.telegramEventId : '';
    const prevEventId =
      beforeData && typeof beforeData.telegramEventId === 'string'
        ? beforeData.telegramEventId
        : '';

    const isRetiro = data.entryType === 'retiro' || cajaId.startsWith('retiro-');
    let shouldNotify = false;

    if (eventId && eventId !== prevEventId) {
      shouldNotify = true;
    } else if (!isRetiro && data.entryType === 'cierre') {
      // Fallback: cierre real sin telegramEventId (apps viejas)
      const fp = [
        data.cajaTotal,
        data.totalGuardado,
        data.closedByName,
        data.sinMovimiento === true,
      ].join('|');
      const prevFp = beforeData
        ? [
            beforeData.cajaTotal,
            beforeData.totalGuardado,
            beforeData.closedByName,
            beforeData.sinMovimiento === true,
          ].join('|')
        : '';
      shouldNotify = fp !== prevFp && typeof data.closedByName === 'string' && data.closedByName.length > 0;
    }

    if (!shouldNotify) {
      logger.info('Caja write sin notificación Telegram', {
        cajaId,
        entryType: data.entryType ?? null,
        hasEventId: Boolean(eventId),
      });
      return;
    }

    const text = isRetiro ? buildCajaRetiroText(data) : buildCajaCierreText(data);

    await sendTelegramMessage(telegramBotToken.value(), text);
    logger.info('Caja notificada a Telegram', {
      cajaId,
      entryType: isRetiro ? 'retiro' : 'cierre',
      eventId: eventId || 'fallback-cierre',
    });
  }
);

/** 21:00 Argentina, lunes a viernes — avisa si el día aún no tiene cierre real. */
export const remindMissingCajaCierreTelegram = onSchedule(
  {
    schedule: '0 21 * * 1-5',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'southamerica-east1',
    secrets: [telegramBotToken],
  },
  async () => {
    const dayId = argentinaDateId();
    const snap = await getFirestore().collection('caja').doc(dayId).get();
    const data = snap.exists ? snap.data() : undefined;
    const hasCierre = !!data && data.entryType === 'cierre';

    if (hasCierre) {
      logger.info('Cierre ya registrado; sin recordatorio', { dayId });
      return;
    }

    const text = [
      '*Recordatorio de caja*',
      `Hoy (${dayId}) todavía no hay cierre registrado en la app.`,
      '',
      'Si cerraron a mano, cargalo en Historial de caja → Día faltante.',
    ].join('\n');

    await sendTelegramMessage(telegramBotToken.value(), text);
    logger.info('Recordatorio de caja enviado', { dayId });
  }
);
