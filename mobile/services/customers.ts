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
import { db } from '@/lib/firebase';
import { Customer, SaleCustomer } from '@/types';
import { normalizePhoneKey } from '@/utils/phone';
import { DEFAULT_BRAND_ID } from '@advance-coat/shared';
import { listByBrand, withBrandFields } from '@/lib/brandQuery';
import { requireBrandId } from '@/lib/brandScope';

const COLLECTION = 'customers';

function sameBrand(data: Record<string, unknown>): boolean {
  const brandId = requireBrandId();
  if (data.brandId === brandId) return true;
  if (!data.brandId && brandId === DEFAULT_BRAND_ID) return true;
  return false;
}

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name: (data.name as string) ?? '',
    email: (data.email as string) ?? '',
    phone: (data.phone as string) ?? '',
    cuit: (data.cuit as string) || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.(),
  };
}

function normalizeCustomer(customer: SaleCustomer): SaleCustomer {
  return {
    name: customer.name.trim(),
    email: customer.email.trim().toLowerCase(),
    phone: customer.phone.trim(),
    // Firestore no acepta undefined; usar string vacío
    cuit: customer.cuit?.trim() || '',
  };
}

async function findCustomerByEmail(email: string): Promise<Customer | null> {
  if (!email.trim()) return null;

  const q = query(
    collection(db, COLLECTION),
    where('email', '==', email.trim().toLowerCase()),
    limit(10)
  );
  const snap = await getDocs(q);
  const match = snap.docs.find((d) => sameBrand(d.data()));
  if (!match) return null;
  return mapCustomer(match.id, match.data());
}

/** Busca cliente por teléfono (clave normalizada). */
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) return null;

  const byKey = query(
    collection(db, COLLECTION),
    where('phoneKey', '==', phoneKey),
    limit(10)
  );
  const keyed = await getDocs(byKey);
  const match = keyed.docs.find((d) => sameBrand(d.data()));
  if (!match) return null;
  return mapCustomer(match.id, match.data());
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return mapCustomer(docSnap.id, docSnap.data());
}

export async function getCustomers(): Promise<Customer[]> {
  const docs = await listByBrand(COLLECTION, [orderBy('createdAt', 'desc')]);
  return docs.map((d) => mapCustomer(d.id, d.data()));
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

  const docRef = await addDoc(
    collection(db, COLLECTION),
    withBrandFields({
      ...normalized,
      phoneKey: phoneKey ?? '',
      createdAt: serverTimestamp(),
    })
  );
  return docRef.id;
}

/** Upsert por teléfono (prioridad) o email. Actualiza nombre/datos si ya existe. */
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
      cuit: normalized.cuit || byPhone.cuit || '',
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
        cuit: normalized.cuit || byEmail.cuit || '',
        phoneKey: phoneKey ?? normalizePhoneKey(byEmail.phone) ?? '',
      });
      return byEmail.id;
    }
  }

  const docRef = await addDoc(
    collection(db, COLLECTION),
    withBrandFields({
      ...normalized,
      phoneKey: phoneKey ?? '',
      createdAt: serverTimestamp(),
    })
  );
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
  const docs = await listByBrand(COLLECTION, [orderBy('createdAt', 'desc')]);
  return docs.slice(0, max).map((d) => mapCustomer(d.id, d.data()));
}
