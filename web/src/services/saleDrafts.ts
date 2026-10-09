import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type {
  DiscountType,
  PaymentMethod,
  SaleCustomer,
  SaleItem,
  SalePaymentSplit,
} from '@advance-coat/shared';
import { db } from '../lib/firebase';
import { saveCustomer } from './customers';
import type { CreateSaleInput } from './sales';

const COLLECTION = 'saleDrafts';

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export interface SaleDraft {
  id: string;
  date: Date;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  paymentMethodLabel?: string;
  paymentSplits?: SalePaymentSplit[];
  customer: SaleCustomer;
  subtotal: number;
  discountType?: DiscountType | null;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  amountPaid?: number;
  change?: number;
  createdBy: string;
  createdByName?: string;
  wantsInvoice: boolean;
  updatedAt: Date;
}

function mapDraft(id: string, data: Record<string, unknown>): SaleDraft {
  const customer = data.customer as SaleCustomer | undefined;
  return {
    id,
    date: (data.date as Timestamp)?.toDate?.() ?? new Date(),
    items: (data.items as SaleItem[]) ?? [],
    paymentMethod: (data.paymentMethod as PaymentMethod) ?? 'efectivo',
    paymentMethodLabel: data.paymentMethodLabel as string | undefined,
    paymentSplits: (data.paymentSplits as SalePaymentSplit[] | null) ?? undefined,
    customer: customer ?? { name: '', email: '', phone: '' },
    subtotal: (data.subtotal as number) ?? 0,
    discountType: (data.discountType as DiscountType | null) ?? null,
    discountValue: data.discountValue as number | undefined,
    discountAmount: data.discountAmount as number | undefined,
    total: (data.total as number) ?? 0,
    amountPaid: (data.amountPaid as number | null) ?? undefined,
    change: (data.change as number | null) ?? undefined,
    createdBy: (data.createdBy as string) ?? '',
    createdByName: data.createdByName as string | undefined,
    wantsInvoice: data.wantsInvoice === true,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function listSaleDrafts(): Promise<SaleDraft[]> {
  const q = query(collection(db, COLLECTION), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((entry) => mapDraft(entry.id, entry.data()));
}

export async function getSaleDraft(id: string): Promise<SaleDraft | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return mapDraft(snap.id, snap.data());
}

export async function saveSaleDraft(id: string | null, input: CreateSaleInput): Promise<string> {
  const customer = {
    name: input.customer.name.trim(),
    email: input.customer.email.trim().toLowerCase(),
    phone: input.customer.phone.trim(),
    cuit: input.customer.cuit?.trim() || '',
  };
  if (customer.name || customer.email || customer.phone) {
    await saveCustomer(customer);
  }

  const payload = {
    date: Timestamp.fromDate(input.date),
    items: input.items.map((item) => withoutUndefined(item)),
    paymentMethod: input.paymentMethod,
    paymentMethodLabel: input.paymentMethodLabel,
    paymentSplits: input.paymentSplits ?? null,
    customer,
    subtotal: input.subtotal,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    discountAmount: input.discountAmount ?? 0,
    total: input.total,
    amountPaid: input.amountPaid ?? null,
    change: input.change ?? null,
    wantsInvoice: input.wantsInvoice === true,
    createdBy: input.createdBy,
    createdByName: input.createdByName ?? '',
    updatedAt: serverTimestamp(),
  };

  if (id) {
    await updateDoc(doc(db, COLLECTION, id), payload);
    return id;
  }

  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteSaleDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
