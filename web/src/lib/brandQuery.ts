import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireBrandId } from './brandScope';

/** Lista docs de una colección filtrados por marca activa (con fallback sin índice). */
export async function listByBrand(
  collectionName: string,
  extra: QueryConstraint[] = [],
  brandId?: string
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const bid = brandId ?? requireBrandId();
  try {
    const q = query(collection(db, collectionName), where('brandId', '==', bid), ...extra);
    const snap = await getDocs(q);
    return snap.docs;
  } catch {
    const snap = await getDocs(query(collection(db, collectionName), ...extra));
    return snap.docs.filter((d) => {
      const data = d.data();
      if (data.brandId === bid) return true;
      // legacy Advance: docs sin brandId
      if (!data.brandId && bid === 'advance-coat') return true;
      return false;
    });
  }
}

export function withBrandFields<T extends Record<string, unknown>>(
  data: T,
  brandId?: string
): T & { brandId: string } {
  return { ...data, brandId: brandId ?? requireBrandId() };
}
