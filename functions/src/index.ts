import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { buildCajaCierreText, buildCajaRetiroText } from './cajaMessages';
import { buildSaleGroupTextFromDoc } from './saleGroupText';
import { sendTelegramMessage } from './telegram';

initializeApp();

const LEGACY_COLLECTIONS = [
  'products',
  'sales',
  'saleDrafts',
  'caja',
  'cajaCentral',
  'cajaCentralMovements',
  'customers',
  'presupuestos',
  'flexShipments',
  'auditLogs',
] as const;

function needsLegacyBrandId(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

const ADVANCE_BRAND_ID = 'advance-coat';

function isAdvanceBrandName(name: unknown): boolean {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return n === 'advance coat' || n === 'advancecoat' || n.includes('advance coat');
}

type SealResult = {
  ok: true;
  summary: Record<string, number>;
  brandIdSamples: Record<string, Record<string, number>>;
  brands: Array<{ id: string; name: string }>;
  advanceMembers: Array<{
    email: string;
    role: string;
    active: unknown;
    pendingApproval: unknown;
    brandId: unknown;
  }>;
  dominantProductBrandId: string | null;
  force: boolean;
};

/**
 * Sella brandId advance-coat (Admin SDK) para que empleados puedan listar.
 * force=true: mueve a advance-coat todo lo que no sea de otra marca real distinta.
 */
async function runSealAdvanceLegacyBrandIds(force = false): Promise<SealResult> {
  const db = getFirestore();
  const brandDocs = await db.collection('brands').get();
  const brands = brandDocs.docs.map((d) => ({
    id: d.id,
    name: String(d.data().name || ''),
  }));
  const brandIds = new Set(brands.map((b) => b.id));
  const otherRealBrandIds = new Set(
    brands
      .filter((b) => b.id !== ADVANCE_BRAND_ID && !isAdvanceBrandName(b.name))
      .map((b) => b.id)
  );
  // Marcas duplicadas "Advance Coat" con otro id → también unificar a advance-coat
  const duplicateAdvanceBrandIds = new Set(
    brands
      .filter((b) => b.id !== ADVANCE_BRAND_ID && isAdvanceBrandName(b.name))
      .map((b) => b.id)
  );

  const summary: Record<string, number> = {};
  const brandIdSamples: Record<string, Record<string, number>> = {};
  let dominantProductBrandId: string | null = null;

  for (const col of LEGACY_COLLECTIONS) {
    const snap = await db.collection(col).get();
    let batch = db.batch();
    let ops = 0;
    let updated = 0;
    const counts: Record<string, number> = {};

    for (const docSnap of snap.docs) {
      const raw = docSnap.data().brandId;
      const key =
        raw === undefined || raw === null || raw === ''
          ? '(vacío)'
          : String(raw);
      counts[key] = (counts[key] || 0) + 1;

      const missing = needsLegacyBrandId(raw);
      const asString = typeof raw === 'string' ? raw : '';
      const orphan =
        typeof raw === 'string' &&
        raw.length > 0 &&
        raw !== ADVANCE_BRAND_ID &&
        !brandIds.has(raw);
      const duplicateAdvance =
        typeof raw === 'string' && duplicateAdvanceBrandIds.has(raw);
      const notAdvanceString =
        force &&
        (missing ||
          typeof raw !== 'string' ||
          raw !== ADVANCE_BRAND_ID) &&
        !(typeof raw === 'string' && otherRealBrandIds.has(raw));

      // Sellar: vacío, huérfano, duplicado Advance, o force (salvo otras marcas reales)
      if (!(missing || orphan || duplicateAdvance || notAdvanceString)) continue;
      if (asString === ADVANCE_BRAND_ID) continue;

      batch.update(docSnap.ref, {
        brandId: ADVANCE_BRAND_ID,
        updatedAt: FieldValue.serverTimestamp(),
      });
      ops += 1;
      updated += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    summary[col] = updated;
    brandIdSamples[col] = counts;

    if (col === 'products') {
      let best = 0;
      for (const [k, v] of Object.entries(counts)) {
        if (v > best) {
          best = v;
          dominantProductBrandId = k === '(vacío)' ? null : k;
        }
      }
    }
  }

  const usersSnap = await db.collection('users').get();
  let batch = db.batch();
  let ops = 0;
  let usersUpdated = 0;
  let usersReactivated = 0;
  const advanceMembers: SealResult['advanceMembers'] = [];

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    if (data.role === 'super_admin') continue;

    const email = String(data.email || '').toLowerCase();
    const current = data.brandId as string | null | undefined;
    const missing = needsLegacyBrandId(current);
    const orphan =
      typeof current === 'string' &&
      current.length > 0 &&
      current !== ADVANCE_BRAND_ID &&
      !brandIds.has(current);
    const onDuplicateAdvance =
      typeof current === 'string' && duplicateAdvanceBrandIds.has(current);
    const emailLooksAdvance = email.includes('advance');
    const isAdvance =
      missing ||
      orphan ||
      onDuplicateAdvance ||
      current === ADVANCE_BRAND_ID ||
      emailLooksAdvance ||
      (force && !(typeof current === 'string' && otherRealBrandIds.has(current)));

    const patch: Record<string, unknown> = {};
    if (
      missing ||
      orphan ||
      onDuplicateAdvance ||
      emailLooksAdvance ||
      (force && isAdvance && current !== ADVANCE_BRAND_ID)
    ) {
      if (!(typeof current === 'string' && otherRealBrandIds.has(current) && !emailLooksAdvance && !onDuplicateAdvance)) {
        patch.brandId = ADVANCE_BRAND_ID;
      }
    }

    if (
      (isAdvance || patch.brandId === ADVANCE_BRAND_ID) &&
      data.pendingApproval !== true &&
      data.active === false
    ) {
      patch.active = true;
      patch.pendingApproval = false;
      usersReactivated += 1;
    }

    // Aprobados de Advance: asegurar active true
    if (
      (patch.brandId === ADVANCE_BRAND_ID || current === ADVANCE_BRAND_ID || onDuplicateAdvance) &&
      data.pendingApproval !== true &&
      data.active !== true
    ) {
      patch.active = true;
      if (data.active === false) usersReactivated += 1;
    }

    if (Object.keys(patch).length > 0) {
      batch.update(docSnap.ref, patch);
      ops += 1;
      usersUpdated += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    const finalBrand = (patch.brandId as string | undefined) ?? current ?? null;
    if (
      finalBrand === ADVANCE_BRAND_ID ||
      isAdvance ||
      emailLooksAdvance ||
      onDuplicateAdvance
    ) {
      advanceMembers.push({
        email: String(data.email || ''),
        role: String(data.role || ''),
        active: patch.active ?? data.active,
        pendingApproval: data.pendingApproval,
        brandId: finalBrand,
      });
    }
  }
  if (ops > 0) await batch.commit();
  summary.users = usersUpdated;
  summary.usersReactivated = usersReactivated;

  // Asegurar doc brands/advance-coat
  const advanceRef = db.collection('brands').doc(ADVANCE_BRAND_ID);
  const advanceSnap = await advanceRef.get();
  if (!advanceSnap.exists) {
    await advanceRef.set({
      name: 'Advance Coat',
      planId: 'enterprise',
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    summary.brandsCreated = 1;
  }

  logger.info('sealAdvanceLegacyBrandIds ok', {
    summary,
    brandIdSamples,
    dominantProductBrandId,
    force,
  });

  return {
    ok: true,
    summary,
    brandIdSamples,
    brands,
    advanceMembers: advanceMembers.slice(0, 50),
    dominantProductBrandId,
    force,
  };
}

/**
 * Sella brandId advance-coat en docs legacy (Admin SDK).
 * Solo super_admin / felimq09. Pasar { force: true } para unificar duplicados.
 */
export const sealAdvanceLegacyBrandIds = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const email = (request.auth?.token?.email as string | undefined)?.toLowerCase() ?? '';
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Tenés que iniciar sesión.');
    }

    const db = getFirestore();
    const profile = (await db.collection('users').doc(uid).get()).data();
    const isSuper =
      email === 'felimq09@gmail.com' ||
      profile?.role === 'super_admin' ||
      (typeof profile?.email === 'string' && profile.email.toLowerCase() === 'felimq09@gmail.com');
    if (!isSuper) {
      throw new HttpsError('permission-denied', 'Solo super admin puede migrar Advance.');
    }

    const force = Boolean((request.data as { force?: boolean } | undefined)?.force);
    return runSealAdvanceLegacyBrandIds(force);
  }
);

/** Token de BotFather — firebase functions:secrets:set TELEGRAM_BOT_TOKEN */
const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
/** ID del grupo/chat — firebase functions:secrets:set TELEGRAM_CHAT_ID */
const telegramChatId = defineSecret('TELEGRAM_CHAT_ID');
/**
 * JSON de config web del cliente (apiKey, authDomain, projectId, …).
 * firebase functions:secrets:set WEB_CLIENT_FIREBASE_CONFIG
 * (no puede empezar con FIREBASE_ — prefijo reservado)
 */
const firebaseWebConfig = defineSecret('WEB_CLIENT_FIREBASE_CONFIG');

const functionOpts = {
  region: 'southamerica-east1' as const,
  secrets: [telegramBotToken, telegramChatId],
};

/** Expone la config pública del cliente sin versionarla en el repo ni en Vercel VITE_*. */
export const getWebFirebaseConfig = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [firebaseWebConfig],
    cors: true,
  },
  (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      const parsed = JSON.parse(firebaseWebConfig.value()) as Record<string, unknown>;
      if (!parsed.apiKey || !parsed.projectId || !parsed.authDomain) {
        throw new Error('WEB_CLIENT_FIREBASE_CONFIG incompleto');
      }
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).json(parsed);
    } catch (err) {
      logger.error('getWebFirebaseConfig falló', err);
      res.status(500).json({ error: 'Config no disponible' });
    }
  }
);

function argentinaDateId(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Resuelve a qué chat mandar:
 * - Advance (o docs sin brandId): secret global TELEGRAM_CHAT_ID
 * - Otras marcas: solo si brands/{id}.telegramEnabled !== false y telegramChatId
 */
async function resolveTelegramChatId(brandId: unknown): Promise<string | null> {
  const bid =
    typeof brandId === 'string' && brandId.trim().length > 0 ? brandId.trim() : ADVANCE_BRAND_ID;

  try {
    const snap = await getFirestore().collection('brands').doc(bid).get();
    const data = snap.exists ? snap.data() ?? {} : {};

    if (snap.exists && data.telegramEnabled === false) {
      logger.info('Telegram deshabilitado para la marca', { brandId: bid });
      return null;
    }

    // Advance (o legacy): bot + chat global de Control+
    if (bid === ADVANCE_BRAND_ID) {
      const globalId = telegramChatId.value()?.trim();
      return globalId || null;
    }

    if (!snap.exists) {
      logger.info('Telegram: marca inexistente, se omite', { brandId: bid });
      return null;
    }

    const chat =
      typeof data.telegramChatId === 'string' ? data.telegramChatId.trim() : '';
    if (!chat) {
      logger.info('Telegram sin chatId configurado', { brandId: bid });
      return null;
    }
    return chat;
  } catch (err) {
    logger.error('Telegram: error leyendo marca', { brandId: bid, err });
    return null;
  }
}

async function notifyTelegramForBrand(brandId: unknown, text: string): Promise<boolean> {
  const chatId = await resolveTelegramChatId(brandId);
  if (!chatId) return false;
  await sendTelegramMessage(telegramBotToken.value(), chatId, text);
  return true;
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

    const sent = await notifyTelegramForBrand(
      data.brandId,
      buildSaleGroupTextFromDoc(data)
    );
    if (!sent) {
      logger.info('Venta sin destino Telegram', {
        saleId: event.params.saleId,
        brandId: data.brandId ?? null,
      });
      return;
    }
    logger.info('Venta notificada a Telegram', { saleId: event.params.saleId });
  }
);

/**
 * Cierre de caja y retiros.
 * Dispara si cambia telegramEventId, o si es un cierre (entryType === 'cierre' o legacy
 * sin entryType) con cambios de totales — cubre clientes viejos sin telegramEventId.
 * No avisa al solo actualizar el fondo de cambio (entryType === 'fondo').
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
    const isFondo = data.entryType === 'fondo';
    if (isFondo) {
      logger.info('Caja fondo sin notificación Telegram', { cajaId });
      return;
    }

    let shouldNotify = false;

    if (eventId && eventId !== prevEventId) {
      shouldNotify = true;
    } else if (!isRetiro && (data.entryType === 'cierre' || data.entryType == null)) {
      // Fallback: cierre real (o legacy sin entryType) sin telegramEventId nuevo
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
      shouldNotify =
        fp !== prevFp && typeof data.closedByName === 'string' && data.closedByName.length > 0;
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

    const sent = await notifyTelegramForBrand(data.brandId, text);
    if (!sent) {
      logger.info('Caja sin destino Telegram', {
        cajaId,
        brandId: data.brandId ?? null,
        entryType: isRetiro ? 'retiro' : 'cierre',
      });
      return;
    }
    logger.info('Caja notificada a Telegram', {
      cajaId,
      brandId: data.brandId ?? null,
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
    secrets: [telegramBotToken, telegramChatId],
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

    const sent = await notifyTelegramForBrand(ADVANCE_BRAND_ID, text);
    if (!sent) {
      logger.warn('Recordatorio de caja sin destino Telegram', { dayId });
      return;
    }
    logger.info('Recordatorio de caja enviado', { dayId });
  }
);
