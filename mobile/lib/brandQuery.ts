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

/**
 * Lista docs filtrados por marca activa.
 * Nunca hace un scan global de la colección: eso solo funciona para super_admin
 * y deja a empleados/dueños con arrays vacíos (dashboards en 0).
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

  // 1) Query indexada: brandId + extras (orderBy, etc.)
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where('brandId', '==', bid), ...extra)
    );
    merge(snap.docs);
  } catch {
    // 2) Sin índice compuesto: solo brandId y ordenamos en cliente si hace falta
    try {
      const snap = await getDocs(
        query(collection(db, collectionName), where('brandId', '==', bid))
      );
      merge(snap.docs);
    } catch {
      // sin acceso / colección inexistente
    }
  }

  // 3) Advance legacy: docs sin brandId (solo si ya somos marca Advance).
  if (bid === DEFAULT_BRAND_ID) {
    try {
      const snap =
        extra.length > 0
          ? await getDocs(query(collection(db, collectionName), ...extra))
          : await getDocs(collection(db, collectionName));
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.brandId === bid || isLegacyAdvanceDoc(data, bid)) {
          byId.set(d.id, d);
        }
      });
    } catch {
      // Empleados/admins de marca no pueden listar sin filtro: OK, ya tenemos brandId.
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
