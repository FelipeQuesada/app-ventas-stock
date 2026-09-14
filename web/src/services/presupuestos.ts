import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type { DiscountType, Presupuesto, PresupuestoItem, SaleCustomer } from '@advance-coat/shared';
import { calculateDiscount, calculateSaleTotal, normalizePhoneKey } from '@advance-coat/shared';
import { db } from '../lib/firebase';
import { saveCustomer } from './customers';

/**
 * Guardamos en `sales` con recordType=presupuesto porque las reglas de Firestore
 * ya permiten esa colección. Así no hace falta desplegar reglas nuevas.
 */
const COLLECTION = 'sales';
const RECORD_TYPE = 'presupuesto';

function isPresupuestoDoc(data: Record<string, unknown>): boolean {
  return data.recordType === RECORD_TYPE;
}

function sanitizeItems(items: PresupuestoItem[]): PresupuestoItem[] {
  return items.map((item) => {
    const clean: PresupuestoItem = {
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    };
    if (item.productId) clean.productId = item.productId;
    return clean;
  });
}

function mapPresupuesto(id: string, data: Record<string, unknown>): Presupuesto {
  const customer = (data.customer as SaleCustomer) ?? {
    name: '',
    email: '',
    phone: '',
    cuit: '',
  };

  return {
    id,
    date: (data.date as Timestamp)?.toDate?.() ?? new Date(),
    validUntil: (data.validUntil as Timestamp)?.toDate?.() ?? new Date(),
    contactName: (data.contactName as string) ?? '',
    contactPhone: (data.contactPhone as string) ?? '',
    contactEmail: (data.contactEmail as string) ?? '',
    customer: {
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      cuit: customer.cuit || undefined,
    },
    customerId: (data.customerId as string) || undefined,
    items: sanitizeItems((data.items as PresupuestoItem[]) ?? []),
    notes: (data.notes as string) || undefined,
    subtotal: (data.subtotal as number) ?? (data.total as number) ?? 0,
    discountType: (data.discountType as DiscountType | undefined) || undefined,
    discountValue: (data.discountValue as number) || undefined,
    discountAmount: (data.discountAmount as number) || undefined,
    total: (data.total as number) ?? 0,
    createdBy: (data.createdBy as string) ?? '',
    createdByName: (data.createdByName as string) || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

function normalizeCustomer(input: SaleCustomer): SaleCustomer {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    cuit: input.cuit?.trim() || '',
  };
}

export interface CreatePresupuestoInput {
  date: Date;
  validUntil: Date;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  customer: SaleCustomer;
  items: PresupuestoItem[];
  notes?: string;
  discountType?: DiscountType | null;
  discountValue?: number;
  discountAmount?: number;
  createdBy: string;
  createdByName?: string;
}

async function upsertCustomerId(customer: SaleCustomer): Promise<string> {
  if (!customer.name && !customer.email && !customer.phone) return '';
  return saveCustomer(customer);
}

function buildPayload(input: CreatePresupuestoInput, customerId: string) {
  const customer = normalizeCustomer(input.customer);
  const subtotal = input.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountType = input.discountType ?? null;
  const discountValue = input.discountValue ?? 0;
  const discountAmount =
    input.discountAmount ?? calculateDiscount(subtotal, discountType, discountValue);
  const total = calculateSaleTotal(subtotal, discountAmount);
  return {
    recordType: RECORD_TYPE,
    date: Timestamp.fromDate(input.date),
    validUntil: Timestamp.fromDate(input.validUntil),
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    customer,
    customerId: customerId || null,
    phoneKey: normalizePhoneKey(customer.phone) ?? '',
    items: sanitizeItems(input.items),
    notes: input.notes?.trim() || null,
    subtotal,
    discountType: discountType || null,
    discountValue: discountType ? discountValue : 0,
    discountAmount,
    total,
    paymentMethod: 'efectivo',
    paymentMethodLabel: 'Presupuesto',
    customerCount: 1,
  };
}

export async function createPresupuesto(input: CreatePresupuestoInput): Promise<Presupuesto> {
  const customer = normalizeCustomer(input.customer);
  const customerId = await upsertCustomerId(customer);
  const payload = buildPayload(input, customerId);

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...payload,
    createdBy: input.createdBy,
    createdByName: input.createdByName ?? '',
    createdAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  return mapPresupuesto(snap.id, snap.data() ?? {});
}

export async function updatePresupuesto(
  id: string,
  input: CreatePresupuestoInput
): Promise<Presupuesto> {
  const existing = await getPresupuesto(id);
  if (!existing) throw new Error('Presupuesto no encontrado');

  const customer = normalizeCustomer(input.customer);
  const customerId = await upsertCustomerId(customer);
  await updateDoc(doc(db, COLLECTION, id), buildPayload(input, customerId));

  const snap = await getDoc(doc(db, COLLECTION, id));
  return mapPresupuesto(snap.id, snap.data() ?? {});
}

export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!isPresupuestoDoc(data)) return null;
  return mapPresupuesto(snap.id, data);
}

export async function getPresupuestos(): Promise<Presupuesto[]> {
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => isPresupuestoDoc(d.data()))
    .map((d) => mapPresupuesto(d.id, d.data()))
    .sort((a, b) => {
      const aTime = (a.createdAt ?? a.date).getTime();
      const bTime = (b.createdAt ?? b.date).getTime();
      return bTime - aTime;
    });
}

export async function getPresupuestosByCustomerPhone(phone: string): Promise<Presupuesto[]> {
  const phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) return [];
  const all = await getPresupuestos();
  return all.filter((p) => normalizePhoneKey(p.customer.phone) === phoneKey);
}

export async function getPresupuestosByCustomerId(customerId: string): Promise<Presupuesto[]> {
  if (!customerId) return [];
  const all = await getPresupuestos();
  return all.filter((p) => p.customerId === customerId);
}

export async function deletePresupuesto(id: string): Promise<void> {
  const existing = await getPresupuesto(id);
  if (!existing) return;
  await deleteDoc(doc(db, COLLECTION, id));
}
