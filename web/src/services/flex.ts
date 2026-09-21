import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  calcFlexLineTotal,
  dateToFlexId,
  FLEX_ZONE_PRICES,
  isFlexZoneId,
  type FlexShipment,
  type FlexZoneId,
} from '@advance-coat/shared';
import { db } from '../lib/firebase';

const COLLECTION = 'flexShipments';

function mapShipment(id: string, data: Record<string, unknown>): FlexShipment | null {
  const zoneRaw = String(data.zone ?? '');
  if (!isFlexZoneId(zoneRaw)) return null;
  const quantity = Number(data.quantity) || 0;
  const unitPrice =
    typeof data.unitPrice === 'number' ? data.unitPrice : FLEX_ZONE_PRICES[zoneRaw];
  const date = (data.date as Timestamp)?.toDate?.() ?? new Date();
  return {
    id,
    date,
    dateId: typeof data.dateId === 'string' ? data.dateId : dateToFlexId(date),
    zone: zoneRaw,
    locality: String(data.locality ?? ''),
    quantity,
    unitPrice,
    total: typeof data.total === 'number' ? data.total : calcFlexLineTotal(zoneRaw, quantity),
    createdBy: String(data.createdBy ?? ''),
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? date,
  };
}

export async function getFlexShipmentsByMonth(month: Date): Promise<FlexShipment[]> {
  const startId = dateToFlexId(new Date(month.getFullYear(), month.getMonth(), 1));
  const endId = dateToFlexId(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const q = query(
    collection(db, COLLECTION),
    where('dateId', '>=', startId),
    where('dateId', '<=', endId),
    orderBy('dateId', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapShipment(d.id, d.data()))
    .filter((s): s is FlexShipment => s !== null);
}

export async function addFlexShipment(input: {
  date: Date;
  zone: FlexZoneId;
  locality: string;
  quantity: number;
  createdBy: string;
  createdByName?: string;
}): Promise<string> {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const unitPrice = FLEX_ZONE_PRICES[input.zone];
  const total = calcFlexLineTotal(input.zone, quantity);
  const dateId = dateToFlexId(input.date);
  const docRef = await addDoc(collection(db, COLLECTION), {
    date: Timestamp.fromDate(
      new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate(), 12, 0, 0)
    ),
    dateId,
    zone: input.zone,
    locality: input.locality.trim(),
    quantity,
    unitPrice,
    total,
    createdBy: input.createdBy,
    createdByName: input.createdByName ?? '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function addFlexShipmentsBatch(
  items: Array<{
    date: Date;
    zone: FlexZoneId;
    locality: string;
    quantity: number;
  }>,
  meta: { createdBy: string; createdByName?: string }
): Promise<number> {
  let count = 0;
  for (const item of items) {
    await addFlexShipment({
      ...item,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
    });
    count += 1;
  }
  return count;
}

export async function deleteFlexShipment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
