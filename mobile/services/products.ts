import {
  collection,
  doc,
  getDocs,
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
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Product } from '@/types';
import { logAudit } from '@/services/audit';
import { listByBrand, withBrandFields } from '@/lib/brandQuery';
import { requireBrandId } from '@/lib/brandScope';

const COLLECTION = 'products';

export function invalidateProductsCache() {
  // Las lecturas son por marca vía listByBrand; no hay cache local persistente.
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
  const docs = await listByBrand(COLLECTION, [orderBy('name')]);
  return docs
    .map((d) => mapProduct(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
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
      onData(snap.docs.map((d) => mapProduct(d.id, d.data())));
    },
    async () => {
      // Fallback si falta índice o docs legacy sin brandId
      try {
        const docs = await listByBrand(COLLECTION, [orderBy('name')]);
        onData(docs.map((d) => mapProduct(d.id, d.data())));
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
  imageUri?: string
): Promise<string> {
  let imageUrl = data.imageUrl;
  if (imageUri && imageUri.startsWith('file://')) {
    imageUrl = await uploadProductImage(imageUri);
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
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>,
  imageUri?: string
) {
  let imageUrl = data.imageUrl;
  if (imageUri && imageUri.startsWith('file://')) {
    imageUrl = await uploadProductImage(imageUri, id);
  }
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    updatedAt: serverTimestamp(),
  });
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

  return totalDeleted;
}

async function uploadProductImage(uri: string, productId?: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const brandId = requireBrandId();
  const filename = `products/${brandId}/${productId ?? Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
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
