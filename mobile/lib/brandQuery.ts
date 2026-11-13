import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { DEFAULT_BRAND_ID } from '@advance-coat/shared';
import { db } from '@/lib/firebase';
import { requireBrandId } from '@/lib/brandScope';

function isLegacyAdvanceDoc(data: DocumentData, bid: string): boolean {
  if (bid !== DEFAULT_BRAND_ID) return false;
  const value = data.brandId;
  return value === undefined || value === null || value === '';
}

/** Lista docs de una colección filtrados por marca activa (con fallback sin índice). */
export async function listByBrand(
  collectionName: string,
  extra: QueryConstraint[] = [],
  brandId?: string
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const bid = brandId ?? requireBrandId();
  const byId = new Map<string, QueryDocumentSnapshot<DocumentData>>();

  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where('brandId', '==', bid), ...extra)
    );
    snap.docs.forEach((d) => byId.set(d.id, d));
  } catch {
    // índice faltante u otra constraint: filtramos en cliente
  }

  // Advance: siempre incluir docs legacy sin brandId (la query indexada no los trae)
  if (bid === DEFAULT_BRAND_ID || byId.size === 0) {
    try {
      const snap = await getDocs(query(collection(db, collectionName), ...extra));
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.brandId === bid || isLegacyAdvanceDoc(data, bid)) {
          byId.set(d.id, d);
        }
      });
    } catch {
      // sin extras tampoco: no hay nada que listar
    }
  }

  return [...byId.values()];
}

export function withBrandFields<T extends Record<string, unknown>>(
  data: T,
  brandId?: string
): T & { brandId: string } {
  return { ...data, brandId: brandId ?? requireBrandId() };
}
