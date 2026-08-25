import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { format, parseISO, startOfDay, isValid } from 'date-fns';
import { db } from '@/lib/firebase';
import { CajaCentral, DailyCaja } from '@/types/caja';
import { Sale } from '@/types';
import { calculateCajaGanancia, calculateCambioCierre } from '@/utils/caja';
import { logAudit } from '@/services/audit';

const COLLECTION = 'caja';
/** Pozo central vive en la colección `caja` (reglas ya publicadas). */
const CENTRAL_DOC_ID = '_central';
const CENTRAL_MOVEMENTS = 'cajaCentralMovements';

function dateToId(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseCajaId(id: string): Date | null {
  const parsed = parseISO(id);
  return isValid(parsed) ? parsed : null;
}

export function getMonthCaja(records: DailyCaja[], date = new Date()): DailyCaja[] {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return records.filter((record) => record.date >= start && record.date <= end);
}

export async function getCajaHistory(): Promise<DailyCaja[]> {
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== CENTRAL_DOC_ID)
    .map((d) => mapCaja(d.id, d.data()));
}

export async function deleteCaja(date: Date): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, dateToId(date)));
}

function getTotalGuardado(data: Record<string, unknown>): number {
  if (typeof data.totalGuardado === 'number') return data.totalGuardado;
  if (typeof data.guardo === 'number') return data.guardo;
  return 0;
}

function mapCaja(id: string, data: Record<string, unknown>): DailyCaja {
  const totalGuardado = getTotalGuardado(data);
  return {
    id,
    date: (data.date as Timestamp)?.toDate?.() ?? new Date(),
    cajaCambio: data.cajaCambio as number,
    cajaTotal: data.cajaTotal as number,
    ganancia: data.ganancia as number,
    totalGuardado,
    guardo: data.guardo as number | undefined,
    cambioCierre: data.cambioCierre as number,
    sinMovimiento: data.sinMovimiento === true,
    closedByName: (data.closedByName as string | undefined) || undefined,
    updatedBy: data.updatedBy as string,
    updatedByName: data.updatedByName as string | undefined,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

function mapCentral(id: string, data: Record<string, unknown>): CajaCentral {
  return {
    id,
    balance: typeof data.balance === 'number' ? data.balance : 0,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedBy: data.updatedBy as string | undefined,
    updatedByName: data.updatedByName as string | undefined,
  };
}

export function getTodayCashTotal(sales: Sale[]): number {
  return getCashTotalForDate(sales, new Date());
}

export function getCashTotalForDate(sales: Sale[], date: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return sales
    .filter((sale) => sale.paymentMethod === 'efectivo' && sale.date >= start && sale.date <= end)
    .reduce((sum, sale) => sum + sale.total, 0);
}

export async function getCajaByDate(date: Date): Promise<DailyCaja | null> {
  const id = dateToId(date);
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapCaja(snap.id, snap.data());
}

/** Cambio que quedó en el último cierre anterior, aunque no haya sido ayer. */
export async function getCajaCambioFromPreviousDay(date: Date): Promise<number> {
  const previous = await getPreviousCaja(date);
  if (!previous) return 0;
  return getCambioRemanente(previous);
}

export async function getPreviousCaja(date: Date): Promise<DailyCaja | null> {
  const q = query(
    collection(db, COLLECTION),
    where('date', '<', Timestamp.fromDate(startOfDay(date))),
    orderBy('date', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  const previous = snap.docs[0];
  return previous ? mapCaja(previous.id, previous.data()) : null;
}

function getCambioRemanente(record: DailyCaja): number {
  if (typeof record.cambioCierre === 'number') return record.cambioCierre;
  return record.cajaTotal - record.totalGuardado;
}

/**
 * Pozo a migrar: el totalGuardado más reciente > 0 (hoy o cierres anteriores).
 */
async function resolveInitialCentralBalance(): Promise<number> {
  const todayCaja = await getCajaByDate(new Date());
  if ((todayCaja?.totalGuardado ?? 0) > 0) return todayCaja!.totalGuardado;

  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'), limit(30));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    if (d.id === CENTRAL_DOC_ID) continue;
    const record = mapCaja(d.id, d.data());
    if (todayCaja && record.id === todayCaja.id) continue;
    if (record.totalGuardado > 0) return record.totalGuardado;
  }
  return 0;
}

function centralRef() {
  return doc(db, COLLECTION, CENTRAL_DOC_ID);
}

/** Lee o crea el pozo. Si está en 0, carga el último guardado (ej. $60.000 de ayer). */
export async function getOrCreateCajaCentral(actor?: {
  userId: string;
  userName?: string;
}): Promise<CajaCentral> {
  const ref = centralRef();
  const snap = await getDoc(ref);
  const current = snap.exists() ? mapCentral(snap.id, snap.data()) : null;
  if (current && current.balance > 0) return current;

  const seed = await resolveInitialCentralBalance();
  await setDoc(
    ref,
    {
      balance: seed,
      updatedAt: serverTimestamp(),
      updatedBy: actor?.userId ?? '',
      updatedByName: actor?.userName ?? 'seed',
    },
    { merge: true }
  );

  return {
    id: CENTRAL_DOC_ID,
    balance: seed,
    updatedAt: new Date(),
    updatedBy: actor?.userId,
    updatedByName: actor?.userName ?? 'seed',
  };
}

export async function depositToCajaCentral(input: {
  amount: number;
  actorName: string;
  userId: string;
  userName?: string;
  cajaDateId?: string;
}): Promise<CajaCentral> {
  if (input.amount <= 0) {
    return getOrCreateCajaCentral({ userId: input.userId, userName: input.userName });
  }

  const ref = centralRef();
  await getOrCreateCajaCentral({ userId: input.userId, userName: input.userName });

  const newBalance = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().balance as number) || 0 : 0;
    const next = current + input.amount;
    tx.set(
      ref,
      {
        balance: next,
        updatedAt: serverTimestamp(),
        updatedBy: input.userId,
        updatedByName: input.userName ?? '',
      },
      { merge: true }
    );
    return next;
  });

  try {
    await addDoc(collection(db, CENTRAL_MOVEMENTS), {
      type: 'deposito',
      amount: input.amount,
      date: Timestamp.now(),
      actorName: input.actorName,
      userId: input.userId,
      userName: input.userName ?? '',
      cajaDateId: input.cajaDateId ?? '',
      createdAt: serverTimestamp(),
    });
  } catch {
    // auditoría opcional si las reglas de movements no están publicadas
  }

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: CENTRAL_DOC_ID,
    summary: `Depósito caja central $${input.amount} — ${input.actorName}`,
    userId: input.userId,
    userName: input.userName,
  });

  return {
    id: CENTRAL_DOC_ID,
    balance: newBalance,
    updatedAt: new Date(),
    updatedBy: input.userId,
    updatedByName: input.userName,
  };
}

export async function withdrawFromCajaCentral(input: {
  amount: number;
  actorName: string;
  userId: string;
  userName?: string;
}): Promise<CajaCentral> {
  if (input.amount <= 0) throw new Error('Ingresá un monto válido para el retiro');

  const ref = centralRef();
  await getOrCreateCajaCentral({ userId: input.userId, userName: input.userName });

  const newBalance = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().balance as number) || 0 : 0;
    if (input.amount > current) {
      throw new Error('El retiro no puede ser mayor al saldo de caja central');
    }
    const next = current - input.amount;
    tx.set(
      ref,
      {
        balance: next,
        updatedAt: serverTimestamp(),
        updatedBy: input.userId,
        updatedByName: input.userName ?? '',
      },
      { merge: true }
    );
    return next;
  });

  try {
    await addDoc(collection(db, CENTRAL_MOVEMENTS), {
      type: 'retiro',
      amount: input.amount,
      date: Timestamp.now(),
      actorName: input.actorName,
      userId: input.userId,
      userName: input.userName ?? '',
      createdAt: serverTimestamp(),
    });
  } catch {
    // auditoría opcional
  }

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: CENTRAL_DOC_ID,
    summary: `Retiro caja central $${input.amount} — ${input.actorName}`,
    userId: input.userId,
    userName: input.userName,
  });

  return {
    id: CENTRAL_DOC_ID,
    balance: newBalance,
    updatedAt: new Date(),
    updatedBy: input.userId,
    updatedByName: input.userName,
  };
}

export interface SaveCajaInput {
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  totalGuardado: number;
  /** Monto nuevo a depositar en central (= incremento vs totalGuardado previo) */
  depositoCentral?: number;
  sinMovimiento?: boolean;
  closedByName: string;
  updatedBy: string;
  updatedByName?: string;
}

export async function saveCaja(input: SaveCajaInput): Promise<void> {
  const ganancia = calculateCajaGanancia(input.cajaTotal, input.cajaCambio);
  const cambioCierre = calculateCambioCierre(input.cajaTotal, input.totalGuardado);
  const id = dateToId(input.date);
  const sinMovimiento = input.sinMovimiento === true;

  const existing = await getCajaByDate(input.date);
  const previousGuardado = existing?.totalGuardado ?? 0;
  const deposito =
    typeof input.depositoCentral === 'number'
      ? input.depositoCentral
      : Math.max(0, input.totalGuardado - previousGuardado);

  await setDoc(doc(db, COLLECTION, id), {
    date: Timestamp.fromDate(input.date),
    cajaCambio: input.cajaCambio,
    cajaTotal: input.cajaTotal,
    ganancia,
    totalGuardado: input.totalGuardado,
    guardo: input.totalGuardado,
    cambioCierre,
    sinMovimiento,
    closedByName: input.closedByName,
    updatedBy: input.updatedBy,
    updatedByName: input.updatedByName ?? '',
    updatedAt: serverTimestamp(),
  });

  if (!sinMovimiento && deposito > 0) {
    await depositToCajaCentral({
      amount: deposito,
      actorName: input.closedByName,
      userId: input.updatedBy,
      userName: input.updatedByName,
      cajaDateId: id,
    });
  }

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: id,
    summary: sinMovimiento
      ? `Caja sin movimiento — cambio $${input.cajaCambio} — ${input.closedByName}`
      : `Caja guardada — total $${input.cajaTotal}, ganancia $${ganancia} — ${input.closedByName}`,
    userId: input.updatedBy,
    userName: input.updatedByName,
  });
}

export async function updateTotalGuardado(
  date: Date,
  totalGuardado: number,
  cajaCambio: number,
  cajaTotal: number,
  updatedBy: string,
  updatedByName?: string
): Promise<void> {
  const ganancia = calculateCajaGanancia(cajaTotal, cajaCambio);
  const cambioCierre = calculateCambioCierre(cajaTotal, totalGuardado);
  const id = dateToId(date);

  await setDoc(
    doc(db, COLLECTION, id),
    {
      date: Timestamp.fromDate(date),
      cajaCambio,
      cajaTotal,
      ganancia,
      totalGuardado,
      guardo: totalGuardado,
      cambioCierre,
      updatedBy,
      updatedByName: updatedByName ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: id,
    summary: `Caja actualizada — guardado $${totalGuardado}`,
    userId: updatedBy,
    userName: updatedByName,
  });
}
