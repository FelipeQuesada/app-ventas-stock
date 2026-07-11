import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer, SaleCustomer } from '@/types';

const COLLECTION = 'customers';

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name: (data.name as string) ?? '',
    email: (data.email as string) ?? '',
    phone: (data.phone as string) ?? '',
    createdAt: (data.createdAt as Timestamp)?.toDate?.(),
  };
}

function normalizeCustomer(customer: SaleCustomer): SaleCustomer {
  return {
    name: customer.name.trim(),
    email: customer.email.trim().toLowerCase(),
    phone: customer.phone.trim(),
  };
}

async function findCustomerByEmail(email: string): Promise<string | null> {
  if (!email.trim()) return null;

  const q = query(
    collection(db, COLLECTION),
    where('email', '==', email.trim().toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}

export async function createCustomer(customer: SaleCustomer): Promise<string> {
  const normalized = normalizeCustomer(customer);

  if (!normalized.name && !normalized.email && !normalized.phone) {
    throw new Error('Completá al menos un dato del cliente');
  }

  if (normalized.email) {
    const existing = await findCustomerByEmail(normalized.email);
    if (existing) throw new Error('Ya existe un cliente con ese email');
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...normalized,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function saveCustomer(customer: SaleCustomer): Promise<string> {
  const normalized = normalizeCustomer(customer);
  if (!normalized.name && !normalized.email && !normalized.phone) {
    return '';
  }

  if (normalized.email) {
    const existing = await findCustomerByEmail(normalized.email);
    if (existing) return existing;
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...normalized,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCustomer(id: string, customer: SaleCustomer): Promise<void> {
  const normalized = normalizeCustomer(customer);

  if (!normalized.name && !normalized.email && !normalized.phone) {
    throw new Error('Completá al menos un dato del cliente');
  }

  if (normalized.email) {
    const existing = await findCustomerByEmail(normalized.email);
    if (existing && existing !== id) {
      throw new Error('Ya existe otro cliente con ese email');
    }
  }

  await updateDoc(doc(db, COLLECTION, id), normalized);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getRecentCustomers(max = 20): Promise<Customer[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}
