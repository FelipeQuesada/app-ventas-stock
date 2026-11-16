import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireBrandId } from '@/lib/brandScope';

/**
 * Lista docs filtrados por marca activa.
 * Solo query con brandId (==): las rules de list exigen ese constraint.
 * No hacer scan global: falla para empleados y dejaba dashboards en 0.
 */
export async function listByBrand(
  collectionName: string,
  extra: QueryConstraint[] = [],
  brandId?: string
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const bid = brandId ?? requireBrandId();
  const byId = new Map<string, QueryDocumentSnapshot<DocumentData>>();

  const merge = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
    docs.forEach((d) => byId.set(d.id, d));
  };

  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where('brandId', '==', bid), ...extra)
    );
    merge(snap.docs);
    return [...byId.values()];
  } catch (err) {
    try {
      const snap = await getDocs(
        query(collection(db, collectionName), where('brandId', '==', bid))
      );
      merge(snap.docs);
      return [...byId.values()];
    } catch (err2) {
      const code =
        (err2 as { code?: string })?.code || (err as { code?: string })?.code || '';
      console.error(`[listByBrand] ${collectionName} brandId=${bid}`, err2 || err);
      if (code === 'permission-denied') {
        throw err2 || err;
      }
      return [];
    }
  }
}

export function withBrandFields<T extends Record<string, unknown>>(
  data: T,
  brandId?: string
): T & { brandId: string } {
  return { ...data, brandId: brandId ?? requireBrandId() };
}
