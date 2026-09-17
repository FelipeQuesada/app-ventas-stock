/** Replica de shared buildSaleGroupText para no acoplar el bundle de Functions. */

type SaleItemLike = {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
};

type PaymentSplitLike = {
  method?: string;
  paymentMethodLabel?: string;
  amount?: number;
};

type SaleDocLike = {
  date?: { toDate?: () => Date } | Date | string | null;
  createdByName?: string;
  items?: SaleItemLike[];
  subtotal?: number;
  discountAmount?: number;
  total?: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  paymentSplits?: PaymentSplitLike[] | null;
};

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function toDate(value: SaleDocLike['date']): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  // Cloud Functions corre en UTC; la venta es Argentina (UTC-3).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1;
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  return `${day} de ${MONTHS_ES[month]}, ${year}`;
}

function getPaymentMethodLabel(method: string, storedLabel?: string): string {
  if (storedLabel) return storedLabel;
  const labels: Record<string, string> = {
    transferencia_feli: 'Transferencia Feli',
    transferencia_mateo: 'Transferencia Mateo',
    transferencia_paula: 'Transferencia Paula',
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Crédito',
    qr: 'QR',
    transferencia: 'Transferencia',
    mercado_pago: 'Mercado Pago',
  };
  return labels[method] ?? method;
}

function getSalePaymentLabel(sale: SaleDocLike): string {
  const splits = sale.paymentSplits;
  if (splits && splits.length > 1) {
    if (sale.paymentMethodLabel) return sale.paymentMethodLabel;
    return splits
      .map(
        (s) =>
          `${s.paymentMethodLabel ?? getPaymentMethodLabel(s.method ?? '')} (${formatCurrency(s.amount ?? 0)})`
      )
      .join(' + ');
  }
  return getPaymentMethodLabel(sale.paymentMethod ?? '', sale.paymentMethodLabel);
}

export function buildSaleGroupTextFromDoc(sale: SaleDocLike): string {
  const lines: string[] = [];
  const date = toDate(sale.date);
  lines.push(`Fecha: ${date ? formatDate(date) : '-'}`);
  if (sale.createdByName) lines.push(`Vendedor: ${sale.createdByName}`);
  lines.push('----------------------------');

  for (const item of sale.items ?? []) {
    lines.push(`${item.productName ?? ''}`);
    lines.push(
      `  ${item.quantity ?? 0} x ${formatCurrency(item.unitPrice ?? 0)} = ${formatCurrency(item.subtotal ?? 0)}`
    );
  }

  lines.push('----------------------------');
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal ?? 0)}`);
  if ((sale.discountAmount ?? 0) > 0) {
    lines.push(`Descuento: -${formatCurrency(sale.discountAmount ?? 0)}`);
  }
  lines.push(`TOTAL: ${formatCurrency(sale.total ?? 0)}`);
  lines.push(`Pago: ${getSalePaymentLabel(sale)}`);
  return lines.join('\n');
}
