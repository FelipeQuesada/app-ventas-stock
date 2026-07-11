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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Product } from '@/types';

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

export async function updateProductStock(id: string, stock: number) {
  await updateDoc(doc(db, COLLECTION, id), {
    stock,
    updatedAt: serverTimestamp(),
  });
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

async function uploadProductImage(uri: string, productId?: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = `products/${productId ?? Date.now()}.jpg`;
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
