import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import type { Customer, SaleCustomer } from '@advance-coat/shared';
import { normalizePhoneKey } from '@advance-coat/shared';
import { db } from '../lib/firebase';

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

async function findCustomerByEmail(email: string): Promise<Customer | null> {
  if (!email.trim()) return null;

  const q = query(
    collection(db, COLLECTION),
    where('email', '==', email.trim().toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapCustomer(snap.docs[0].id, snap.docs[0].data());
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) return null;

  const byKey = query(
    collection(db, COLLECTION),
    where('phoneKey', '==', phoneKey),
    limit(1)
  );
  const keyed = await getDocs(byKey);
  if (!keyed.empty) {
    return mapCustomer(keyed.docs[0].id, keyed.docs[0].data());
  }

  const all = await getCustomers();
  return all.find((customer) => normalizePhoneKey(customer.phone) === phoneKey) ?? null;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return mapCustomer(docSnap.id, docSnap.data());
}

export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}

export async function createCustomer(customer: SaleCustomer): Promise<string> {
  const normalized = normalizeCustomer(customer);
  const phoneKey = normalizePhoneKey(normalized.phone);

  if (!normalized.name && !normalized.email && !normalized.phone) {
    throw new Error('Completá al menos un dato del cliente');
  }

  if (phoneKey) {
    const existingPhone = await findCustomerByPhone(normalized.phone);
    if (existingPhone) throw new Error('Ya existe un cliente con ese teléfono');
  }

  if (normalized.email) {
    const existing = await findCustomerByEmail(normalized.email);
    if (existing) throw new Error('Ya existe un cliente con ese email');
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...normalized,
    phoneKey: phoneKey ?? '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function saveCustomer(customer: SaleCustomer): Promise<string> {
  const normalized = normalizeCustomer(customer);
  if (!normalized.name && !normalized.email && !normalized.phone) {
    return '';
  }

  const phoneKey = normalizePhoneKey(normalized.phone);

  const byPhone = phoneKey ? await findCustomerByPhone(normalized.phone) : null;
  if (byPhone) {
    await updateDoc(doc(db, COLLECTION, byPhone.id), {
      name: normalized.name || byPhone.name,
      email: normalized.email || byPhone.email,
      phone: normalized.phone || byPhone.phone,
      phoneKey: phoneKey ?? normalizePhoneKey(byPhone.phone) ?? '',
    });
    return byPhone.id;
  }

  if (normalized.email) {
    const byEmail = await findCustomerByEmail(normalized.email);
    if (byEmail) {
      await updateDoc(doc(db, COLLECTION, byEmail.id), {
        name: normalized.name || byEmail.name,
        email: normalized.email,
        phone: normalized.phone || byEmail.phone,
        phoneKey: phoneKey ?? normalizePhoneKey(byEmail.phone) ?? '',
      });
      return byEmail.id;
    }
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...normalized,
    phoneKey: phoneKey ?? '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCustomer(id: string, customer: SaleCustomer): Promise<void> {
  const normalized = normalizeCustomer(customer);
  const phoneKey = normalizePhoneKey(normalized.phone);

  if (!normalized.name && !normalized.email && !normalized.phone) {
    throw new Error('Completá al menos un dato del cliente');
  }

  if (phoneKey) {
    const existingPhone = await findCustomerByPhone(normalized.phone);
    if (existingPhone && existingPhone.id !== id) {
      throw new Error('Ya existe otro cliente con ese teléfono');
    }
  }

  if (normalized.email) {
    const existing = await findCustomerByEmail(normalized.email);
    if (existing && existing.id !== id) {
      throw new Error('Ya existe otro cliente con ese email');
    }
  }

  await updateDoc(doc(db, COLLECTION, id), {
    ...normalized,
    phoneKey: phoneKey ?? '',
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getRecentCustomers(max = 20): Promise<Customer[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCustomer(d.id, d.data()));
}
