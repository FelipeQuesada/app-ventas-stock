import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sale, SaleItem, PaymentMethod, SaleCustomer, DiscountType } from '@/types';
import { saveCustomer } from '@/services/customers';
import { aggregateProductQuantities, isExtraItem } from '@/utils/sale';
import { normalizePhoneKey } from '@/utils/phone';
const COLLECTION = 'sales';

function mapSale(id: string, data: Record<string, unknown>): Sale {
  const legacyCustomer = data.customer as SaleCustomer | undefined;
  return {
    id,
    date: (data.date as Timestamp)?.toDate?.() ?? new Date(),
    items: data.items as SaleItem[],
    paymentMethod: data.paymentMethod as PaymentMethod,
    paymentMethodLabel: data.paymentMethodLabel as string | undefined,
    customer: legacyCustomer ?? {
      name: '',
      email: '',
      phone: '',
    },
    subtotal: (data.subtotal as number) ?? (data.total as number),
    discountType: data.discountType as DiscountType | undefined,
    discountValue: data.discountValue as number | undefined,
    discountAmount: data.discountAmount as number | undefined,
    total: data.total as number,
    amountPaid: data.amountPaid as number | undefined,
    change: data.change as number | undefined,
    customerCount: (data.customerCount as number) ?? 1,
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string | undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function getSales(): Promise<Sale[]> {
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapSale(d.id, d.data()));
}

export async function getSalesByDateRange(start: Date, end: Date): Promise<Sale[]> {
  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapSale(d.id, d.data()));
}

export interface CreateSaleInput {
  date: Date;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  customer: SaleCustomer;
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  amountPaid?: number;
  change?: number;
  createdBy: string;
  createdByName?: string;
}

export type CreateSaleOptions = {
  skipOfflineQueue?: boolean;
};

export async function createSale(
  input: CreateSaleInput,
  options: CreateSaleOptions = {}
): Promise<string> {
  const { enqueueSale, isLikelyNetworkError } = await import('@/services/offlineQueue');
  const { logAudit } = await import('@/services/audit');

  try {
    const saleId = await commitSaleCreate(input);
    await logAudit({
      action: 'sale_create',
      entityType: 'sale',
      entityId: saleId,
      summary: `Venta por $${input.total}`,
      userId: input.createdBy,
      userName: input.createdByName,
      meta: { total: input.total, paymentMethod: input.paymentMethod },
    });
    return saleId;
  } catch (error) {
    if (!options.skipOfflineQueue && isLikelyNetworkError(error)) {
      await enqueueSale(input);
      const offlineError = new Error(
        'Sin conexión. La venta quedó en cola y se sincronizará automáticamente.'
      );
      (offlineError as Error & { queued?: boolean }).queued = true;
      throw offlineError;
    }
    throw error;
  }
}

async function commitSaleCreate(input: CreateSaleInput): Promise<string> {
  const normalizedCustomer = {
    name: input.customer.name.trim(),
    email: input.customer.email.trim().toLowerCase(),
    phone: input.customer.phone.trim(),
  };

  if (normalizedCustomer.name || normalizedCustomer.email || normalizedCustomer.phone) {
    await saveCustomer(normalizedCustomer);
  }

  const batch = writeBatch(db);
  const quantities = aggregateProductQuantities(input.items);

  for (const [productId, totalQty] of quantities) {
    const productRef = doc(db, 'products', productId);
    const snap = await getDoc(productRef);
    if (snap.exists()) {
      const currentStock = snap.data().stock as number;
      batch.update(productRef, { stock: Math.max(0, currentStock - totalQty) });
    }
  }

  const saleRef = doc(collection(db, COLLECTION));
  batch.set(saleRef, {
    date: Timestamp.fromDate(input.date),
    items: input.items,
    paymentMethod: input.paymentMethod,
    paymentMethodLabel: input.paymentMethodLabel,
    customer: normalizedCustomer,
    subtotal: input.subtotal,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    discountAmount: input.discountAmount ?? 0,
    total: input.total,
    amountPaid: input.amountPaid ?? null,
    change: input.change ?? null,
    customerCount: 1,
    createdBy: input.createdBy,
    createdByName: input.createdByName ?? '',
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return saleRef.id;
}

export async function getSale(saleId: string): Promise<Sale | null> {
  const snap = await getDoc(doc(db, COLLECTION, saleId));
  if (!snap.exists()) return null;
  return mapSale(snap.id, snap.data());
}

export async function updateSale(
  saleId: string,
  input: CreateSaleInput,
  previousItems: SaleItem[]
): Promise<void> {
  const normalizedCustomer = {
    name: input.customer.name.trim(),
    email: input.customer.email.trim().toLowerCase(),
    phone: input.customer.phone.trim(),
  };

  if (normalizedCustomer.name || normalizedCustomer.email || normalizedCustomer.phone) {
    await saveCustomer(normalizedCustomer);
  }

  const batch = writeBatch(db);
  const stockDeltas = new Map<string, number>();

  for (const item of previousItems) {
    if (isExtraItem(item)) continue;
    stockDeltas.set(item.productId, (stockDeltas.get(item.productId) ?? 0) + item.quantity);
  }

  for (const item of input.items) {
    if (isExtraItem(item)) continue;
    stockDeltas.set(item.productId, (stockDeltas.get(item.productId) ?? 0) - item.quantity);
  }

  for (const [productId, delta] of stockDeltas) {
    if (delta === 0) continue;

    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) continue;

    const currentStock = productSnap.data().stock as number;
    const newStock = currentStock + delta;
    if (newStock < 0) {
      throw new Error('Stock insuficiente para uno de los productos');
    }

    batch.update(productRef, { stock: newStock });
  }

  const saleRef = doc(db, COLLECTION, saleId);
  batch.update(saleRef, {
    date: Timestamp.fromDate(input.date),
    items: input.items,
    paymentMethod: input.paymentMethod,
    paymentMethodLabel: input.paymentMethodLabel,
    customer: normalizedCustomer,
    subtotal: input.subtotal,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    discountAmount: input.discountAmount ?? 0,
    total: input.total,
    amountPaid: input.amountPaid ?? null,
    change: input.change ?? null,
    updatedBy: input.createdBy,
    updatedByName: input.createdByName ?? '',
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  const { logAudit } = await import('@/services/audit');
  await logAudit({
    action: 'sale_update',
    entityType: 'sale',
    entityId: saleId,
    summary: `Venta editada — total $${input.total}`,
    userId: input.createdBy,
    userName: input.createdByName,
  });
}

export async function deleteSale(
  saleId: string,
  deletedBy?: { userId: string; userName?: string }
): Promise<void> {
  const saleRef = doc(db, COLLECTION, saleId);
  const snap = await getDoc(saleRef);
  if (!snap.exists()) throw new Error('Venta no encontrada');

  const sale = mapSale(snap.id, snap.data());
  const batch = writeBatch(db);
  const quantities = aggregateProductQuantities(sale.items ?? []);

  for (const [productId, totalQty] of quantities) {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const currentStock = productSnap.data().stock as number;
      batch.update(productRef, { stock: currentStock + totalQty });
    }
  }

  batch.delete(saleRef);
  await batch.commit();

  if (deletedBy?.userId) {
    const { logAudit } = await import('@/services/audit');
    await logAudit({
      action: 'sale_delete',
      entityType: 'sale',
      entityId: saleId,
      summary: `Venta eliminada — total $${sale.total}`,
      userId: deletedBy.userId,
      userName: deletedBy.userName,
    });
  }
}

export function getTodaySales(sales: Sale[]): Sale[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return sales.filter((s) => s.date >= today && s.date < tomorrow);
}

export function getMonthSales(sales: Sale[], date = new Date()): Sale[] {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return sales.filter((s) => s.date >= start && s.date <= end);
}

export function getDaySales(sales: Sale[], date = new Date()): Sale[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return sales.filter((s) => s.date >= start && s.date <= end);
}

export function getSalesByCustomerPhone(sales: Sale[], phone: string): Sale[] {
  const key = normalizePhoneKey(phone);
  if (!key) return [];
  return sales.filter((sale) => normalizePhoneKey(sale.customer?.phone) === key);
}

export interface CustomerPurchaseStats {
  sales: Sale[];
  saleCount: number;
  totalSpent: number;
  topProduct: { name: string; quantity: number } | null;
}

export function getCustomerPurchaseStats(sales: Sale[], phone: string): CustomerPurchaseStats {
  const customerSales = getSalesByCustomerPhone(sales, phone);
  const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);

  const qtyByProduct = new Map<string, number>();
  for (const sale of customerSales) {
    for (const item of sale.items ?? []) {
      if (item.isExtra) continue;
      const name = item.productName || 'Producto';
      qtyByProduct.set(name, (qtyByProduct.get(name) ?? 0) + item.quantity);
    }
  }

  let topProduct: CustomerPurchaseStats['topProduct'] = null;
  for (const [name, quantity] of qtyByProduct) {
    if (!topProduct || quantity > topProduct.quantity) {
      topProduct = { name, quantity };
    }
  }

  return {
    sales: customerSales,
    saleCount: customerSales.length,
    totalSpent,
    topProduct,
  };
}

export async function fetchCustomerPurchaseStats(phone: string): Promise<CustomerPurchaseStats> {
  const sales = await getSales();
  return getCustomerPurchaseStats(sales, phone);
}

export { calculateDiscount } from '@/utils/discount';
