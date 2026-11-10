import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Product } from '@advance-coat/shared';
import { db, storage } from '../lib/firebase';
import { logAudit } from './audit';
import { listByBrand, withBrandFields } from '../lib/brandQuery';
import { requireBrandId } from '../lib/brandScope';

const COLLECTION = 'products';
const PRODUCTS_TTL_MS = 60_000;

let productsCache: { at: number; data: Product[] } | null = null;
let productsInflight: Promise<Product[]> | null = null;

export function invalidateProductsCache() {
  productsCache = null;
}

function mapProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: data.name as string,
    category: data.category as string,
    description: (data.description as string) || '',
    price: data.price as number,
    stock: data.stock as number,
    imageUrl: (data.imageUrl as string) || '',
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
    tiendanubeId: typeof data.tiendanubeId === 'number' ? data.tiendanubeId : undefined,
    tiendanubeVariantId:
      typeof data.tiendanubeVariantId === 'number' ? data.tiendanubeVariantId : undefined,
    hidden: data.hidden === true,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (productsCache && Date.now() - productsCache.at < PRODUCTS_TTL_MS) {
    return productsCache.data;
  }

  if (productsInflight) return productsInflight;

  productsInflight = (async () => {
    const docs = await listByBrand(COLLECTION, [orderBy('name')]);
    const data = docs
      .map((d) => mapProduct(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
    productsCache = { at: Date.now(), data };
    return data;
  })().finally(() => {
    productsInflight = null;
  });

  return productsInflight;
}

export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let brandId: string;
  try {
    brandId = requireBrandId();
  } catch (error) {
    onError?.(error as Error);
    return () => {};
  }

  const q = query(collection(db, COLLECTION), where('brandId', '==', brandId), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => mapProduct(d.id, d.data()));
      productsCache = { at: Date.now(), data };
      onData(data);
    },
    async () => {
      // Fallback si falta índice o docs legacy sin brandId
      try {
        const docs = await listByBrand(COLLECTION, [orderBy('name')]);
        const data = docs.map((d) => mapProduct(d.id, d.data()));
        productsCache = { at: Date.now(), data };
        onData(data);
      } catch (error) {
        onError?.(error as Error);
      }
    }
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapProduct(snap.id, snap.data());
}

export async function createProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  imageFile?: File
): Promise<string> {
  let imageUrl = data.imageUrl;
  if (imageFile) {
    imageUrl = await uploadProductImage(imageFile);
  }
  const docRef = await addDoc(
    collection(db, COLLECTION),
    withBrandFields({
      ...data,
      imageUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  invalidateProductsCache();
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>,
  imageFile?: File
) {
  let imageUrl = data.imageUrl;
  if (imageFile) {
    imageUrl = await uploadProductImage(imageFile, id);
  }
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    updatedAt: serverTimestamp(),
  });
  invalidateProductsCache();
}

export async function updateProductStock(
  id: string,
  stock: number,
  actor?: { userId: string; userName?: string; previousStock?: number; productName?: string }
) {
  await updateDoc(doc(db, COLLECTION, id), {
    stock,
    updatedAt: serverTimestamp(),
  });
  invalidateProductsCache();

  if (actor?.userId) {
    await logAudit({
      action: 'stock_update',
      entityType: 'product',
      entityId: id,
      summary: `${actor.productName ?? 'Producto'}: stock ${actor.previousStock ?? '?'} → ${stock}`,
      userId: actor.userId,
      userName: actor.userName,
      meta: { previousStock: actor.previousStock, stock },
    });
  }
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidateProductsCache();
}

export async function deleteAllProducts(): Promise<number> {
  let totalDeleted = 0;

  while (true) {
    const docs = await listByBrand(COLLECTION);
    if (docs.length === 0) break;

    const batch = writeBatch(db);
    const chunk = docs.slice(0, 450);
    chunk.forEach((productDoc) => {
      batch.delete(productDoc.ref);
    });
    await batch.commit();
    totalDeleted += chunk.length;

    if (docs.length < 450) break;
  }

  invalidateProductsCache();
  return totalDeleted;
}

async function uploadProductImage(file: File, productId?: string): Promise<string> {
  const brandId = requireBrandId();
  const filename = `brands/${brandId}/products/${productId ?? Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function searchProducts(products: Product[], term: string): Promise<Product[]> {
  const lower = term.toLowerCase().trim();
  if (!lower) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
  );
}
