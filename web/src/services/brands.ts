import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
} from 'firebase/firestore';
import type { Brand, BrandStatus, PlanId } from '@advance-coat/shared';
import { DEFAULT_BRAND_ID, PLAN_DEFINITIONS } from '@advance-coat/shared';
import { db } from '../lib/firebase';

const COLLECTION = 'brands';

function mapBrand(id: string, data: Record<string, unknown>): Brand {
  return {
    id,
    name: (data.name as string) || id,
    slug: (data.slug as string) || id,
    logoUrl: (data.logoUrl as string) || undefined,
    ownerUid: (data.ownerUid as string) || '',
    planId: ((data.planId as PlanId) in PLAN_DEFINITIONS
      ? (data.planId as PlanId)
      : 'starter') as PlanId,
    status: (data.status as BrandStatus) || 'active',
    planExpiresAt: (data.planExpiresAt as { toDate?: () => Date })?.toDate?.(),
    phone: (data.phone as string) || undefined,
    email: (data.email as string) || undefined,
    cuit: (data.cuit as string) || undefined,
    businessType: data.businessType as Brand['businessType'],
    sellingStatus: data.sellingStatus as Brand['sellingStatus'],
    salesChannels: Array.isArray(data.salesChannels)
      ? (data.salesChannels as Brand['salesChannels'])
      : undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.(),
  };
}

export async function getBrand(brandId: string): Promise<Brand | null> {
  const snap = await getDoc(doc(db, COLLECTION, brandId));
  if (!snap.exists()) return null;
  return mapBrand(snap.id, snap.data());
}

export async function listBrands(): Promise<Brand[]> {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapBrand(d.id, d.data()));
}

export function slugifyBrandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'marca';
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const q = query(collection(db, COLLECTION), where('slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return true;
  return snap.docs[0].id === excludeId;
}

export async function createBrand(input: {
  id?: string;
  name: string;
  slug: string;
  ownerUid: string;
  planId?: PlanId;
  status?: BrandStatus;
  phone?: string;
  email?: string;
  cuit?: string;
  logoUrl?: string;
  businessType?: string;
  sellingStatus?: string;
  salesChannels?: string[];
}): Promise<Brand> {
  const id = input.id || doc(collection(db, COLLECTION)).id;
  const payload = {
    name: input.name.trim(),
    slug: input.slug,
    ownerUid: input.ownerUid,
    planId: input.planId ?? 'trial',
    status: input.status ?? 'trial',
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    cuit: input.cuit?.trim() || null,
    logoUrl: input.logoUrl || null,
    businessType: input.businessType || null,
    sellingStatus: input.sellingStatus || null,
    salesChannels: input.salesChannels ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, COLLECTION, id), payload);
  try {
    const brand = await getBrand(id);
    if (brand) return brand;
  } catch {
    // Si get falla por rules, igual ya se creó el doc.
  }
  return mapBrand(id, {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Record<string, unknown>);
}

/** Marca cuyo dueño es este uid (recupera registros a medias). */
export async function findBrandByOwnerUid(ownerUid: string): Promise<Brand | null> {
  const q = query(collection(db, COLLECTION), where('ownerUid', '==', ownerUid), limit(1));
  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapBrand(snap.docs[0].id, snap.docs[0].data());
  } catch {
    return null;
  }
}

export async function updateBrand(
  brandId: string,
  data: Partial<{
    name: string;
    logoUrl: string | null;
    planId: PlanId;
    status: BrandStatus;
    phone: string | null;
    email: string | null;
    cuit: string | null;
    businessType: string | null;
    sellingStatus: string | null;
    salesChannels: string[] | null;
    planExpiresAt: Date | null;
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl;
  if (data.planId !== undefined) payload.planId = data.planId;
  if (data.status !== undefined) payload.status = data.status;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.cuit !== undefined) payload.cuit = data.cuit;
  if (data.businessType !== undefined) payload.businessType = data.businessType;
  if (data.sellingStatus !== undefined) payload.sellingStatus = data.sellingStatus;
  if (data.salesChannels !== undefined) payload.salesChannels = data.salesChannels;
  if (data.planExpiresAt !== undefined) payload.planExpiresAt = data.planExpiresAt;
  await updateDoc(doc(db, COLLECTION, brandId), payload);
}

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

export type LegacyMigrationResult = {
  brand: Brand;
  usersUpdated: number;
  docsUpdated: number;
};

function needsLegacyBrandId(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Crea la marca Advance y sella brandId en docs/usuarios legacy sin marca. */
export async function ensureLegacyAdvanceBrand(
  ownerUid: string
): Promise<LegacyMigrationResult> {
  const existing = await getBrand(DEFAULT_BRAND_ID);
  if (!existing) {
    await createBrand({
      id: DEFAULT_BRAND_ID,
      name: 'Advance Coat',
      slug: 'advance-coat',
      ownerUid,
      planId: 'enterprise',
      status: 'active',
      email: 'felimq09@gmail.com',
    });
  }

  let docsUpdated = 0;
  for (const col of LEGACY_COLLECTIONS) {
    const snap = await getDocs(collection(db, col));
    let batch = writeBatch(db);
    let ops = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (!needsLegacyBrandId(data.brandId)) continue;
      batch.update(d.ref, { brandId: DEFAULT_BRAND_ID });
      ops += 1;
      docsUpdated += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }

  // Usuarios legacy sin marca → Advance (no toca dueños de otras marcas ni super_admin)
  const usersSnap = await getDocs(collection(db, 'users'));
  const brandIds = new Set(
    (await getDocs(collection(db, COLLECTION))).docs.map((d) => d.id)
  );
  let batch = writeBatch(db);
  let ops = 0;
  let usersUpdated = 0;
  for (const d of usersSnap.docs) {
    const data = d.data();
    if (data.role === 'super_admin') continue;

    const currentBrandId = data.brandId as string | null | undefined;
    const missing = needsLegacyBrandId(currentBrandId);
    const orphanBrand =
      typeof currentBrandId === 'string' &&
      currentBrandId.length > 0 &&
      currentBrandId !== DEFAULT_BRAND_ID &&
      !brandIds.has(currentBrandId);

    // Solo legacy: sin brandId, o brandId huérfano que no existe como marca
    if (!missing && !orphanBrand) continue;

    batch.update(d.ref, { brandId: DEFAULT_BRAND_ID });
    ops += 1;
    usersUpdated += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  const brand = await getBrand(DEFAULT_BRAND_ID);
  if (!brand) throw new Error('No se pudo asegurar la marca Advance');
  return { brand, usersUpdated, docsUpdated };
}
