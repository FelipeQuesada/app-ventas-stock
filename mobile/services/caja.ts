import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { format, parseISO, startOfDay, isValid } from 'date-fns';
import { db } from '@/lib/firebase';
import { DailyCaja } from '@/types/caja';
import { Sale } from '@/types';
import { calculateCajaGanancia, calculateCambioCierre } from '@/utils/caja';
import { logAudit } from '@/services/audit';

const COLLECTION = 'caja';

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
  return snap.docs.map((d) => mapCaja(d.id, d.data()));
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
    updatedBy: data.updatedBy as string,
    updatedByName: data.updatedByName as string | undefined,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
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

export interface SaveCajaInput {
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  totalGuardado: number;
  sinMovimiento?: boolean;
  updatedBy: string;
  updatedByName?: string;
}

export async function saveCaja(input: SaveCajaInput): Promise<void> {
  const ganancia = calculateCajaGanancia(input.cajaTotal, input.cajaCambio);
  const cambioCierre = calculateCambioCierre(input.cajaTotal, input.totalGuardado);
  const id = dateToId(input.date);
  const sinMovimiento = input.sinMovimiento === true;

  await setDoc(doc(db, COLLECTION, id), {
    date: Timestamp.fromDate(input.date),
    cajaCambio: input.cajaCambio,
    cajaTotal: input.cajaTotal,
    ganancia,
    totalGuardado: input.totalGuardado,
    guardo: input.totalGuardado,
    cambioCierre,
    sinMovimiento,
    updatedBy: input.updatedBy,
    updatedByName: input.updatedByName ?? '',
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: id,
    summary: sinMovimiento
      ? `Caja sin movimiento — cambio $${input.cajaCambio}`
      : `Caja guardada — total $${input.cajaTotal}, ganancia $${ganancia}`,
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
