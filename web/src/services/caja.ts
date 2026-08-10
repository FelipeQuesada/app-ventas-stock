import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { format, parseISO, subDays, isValid } from 'date-fns';
import type { DailyCaja, Sale } from '@advance-coat/shared';
import { calculateCajaGanancia, calculateCambioCierre } from '@advance-coat/shared';
import { db } from '../lib/firebase';
import { getTodaySales } from './sales';
import { logAudit } from './audit';

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
    updatedBy: data.updatedBy as string,
    updatedByName: data.updatedByName as string | undefined,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export function getTodayCashTotal(sales: Sale[]): number {
  const todaySales = getTodaySales(sales);
  return todaySales
    .filter((sale) => sale.paymentMethod === 'efectivo')
    .reduce((sum, sale) => sum + sale.total, 0);
}

export async function getCajaByDate(date: Date): Promise<DailyCaja | null> {
  const id = dateToId(date);
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapCaja(snap.id, snap.data());
}

export async function getCajaCambioFromPreviousDay(date: Date): Promise<number> {
  const yesterday = subDays(date, 1);
  const previous = await getCajaByDate(yesterday);
  if (!previous) return 0;
  return previous.cajaTotal - previous.totalGuardado;
}

export interface SaveCajaInput {
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  totalGuardado: number;
  updatedBy: string;
  updatedByName?: string;
}

export async function saveCaja(input: SaveCajaInput): Promise<void> {
  const ganancia = calculateCajaGanancia(input.cajaTotal, input.cajaCambio);
  const cambioCierre = calculateCambioCierre(input.cajaTotal, input.totalGuardado);
  const id = dateToId(input.date);

  await setDoc(doc(db, COLLECTION, id), {
    date: Timestamp.fromDate(input.date),
    cajaCambio: input.cajaCambio,
    cajaTotal: input.cajaTotal,
    ganancia,
    totalGuardado: input.totalGuardado,
    guardo: input.totalGuardado,
    cambioCierre,
    updatedBy: input.updatedBy,
    updatedByName: input.updatedByName ?? '',
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    action: 'caja_save',
    entityType: 'caja',
    entityId: id,
    summary: `Caja guardada — total $${input.cajaTotal}, ganancia $${ganancia}`,
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
