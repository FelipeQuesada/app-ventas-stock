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

const COLLECTION = 'products';

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
  };
}

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapProduct(d.id, d.data()));
}

export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapProduct(d.id, d.data())));
    },
    (error) => {
      onError?.(error);
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
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    imageUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
    const snap = await getDocs(collection(db, COLLECTION));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((productDoc) => {
      batch.delete(productDoc.ref);
    });
    await batch.commit();
    totalDeleted += snap.docs.length;

    if (snap.docs.length < 500) break;
  }

  return totalDeleted;
}

async function uploadProductImage(file: File, productId?: string): Promise<string> {
  const filename = `products/${productId ?? Date.now()}.jpg`;
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
