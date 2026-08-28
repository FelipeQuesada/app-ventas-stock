import type { PaymentMethod, Sale, SalePaymentSplit } from '../types/index';
import { formatCurrency } from '../utils/format';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; alias?: string }[] = [
  { value: 'transferencia_feli', label: 'Transferencia Feli', icon: 'account-balance', alias: 'feliquesada' },
  { value: 'transferencia_mateo', label: 'Transferencia Mateo', icon: 'account-balance', alias: 'matequesada' },
  { value: 'transferencia_paula', label: 'Transferencia Paula', icon: 'account-balance', alias: 'Paularuben.mp' },
  { value: 'efectivo', label: 'Efectivo', icon: 'payments' },
  { value: 'debito', label: 'Débito', icon: 'credit-card' },
  { value: 'credito', label: 'Crédito', icon: 'credit-card' },
  { value: 'qr', label: 'QR', icon: 'qr-code' },
];

const LEGACY_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  mercado_pago: 'Mercado Pago',
};

export function getPaymentMethodLabel(method: string, storedLabel?: string): string {
  if (storedLabel) return storedLabel;
  const found = PAYMENT_METHODS.find((pm) => pm.value === method);
  if (found) return found.label;
  return LEGACY_LABELS[method] ?? method;
}

export function getPaymentMethodAlias(method: PaymentMethod | null | undefined): string | null {
  if (!method) return null;
  return PAYMENT_METHODS.find((pm) => pm.value === method)?.alias ?? null;
}

export const INVOICE_ELIGIBLE_METHODS: PaymentMethod[] = ['debito', 'credito', 'qr'];

export function formatPaymentSplitsLabel(splits: SalePaymentSplit[]): string {
  return splits
    .map(
      (s) =>
        `${s.paymentMethodLabel ?? getPaymentMethodLabel(s.method)} (${formatCurrency(s.amount)})`
    )
    .join(' + ');
}

export function getSalePaymentLabel(
  sale: Pick<Sale, 'paymentMethod' | 'paymentMethodLabel' | 'paymentSplits'>
): string {
  if (sale.paymentSplits && sale.paymentSplits.length > 1) {
    return sale.paymentMethodLabel ?? formatPaymentSplitsLabel(sale.paymentSplits);
  }
  return getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel);
}

export function getSaleCashAmount(
  sale: Pick<Sale, 'paymentMethod' | 'total' | 'paymentSplits'>
): number {
  if (sale.paymentSplits?.length) {
    return sale.paymentSplits
      .filter((s) => s.method === 'efectivo')
      .reduce((sum, s) => sum + s.amount, 0);
  }
  return sale.paymentMethod === 'efectivo' ? sale.total : 0;
}

export function saleUsesPaymentMethod(
  sale: Pick<Sale, 'paymentMethod' | 'paymentSplits'>,
  method: PaymentMethod
): boolean {
  if (sale.paymentSplits?.length) {
    return sale.paymentSplits.some((s) => s.method === method);
  }
  return sale.paymentMethod === method;
}

export function saleHasInvoiceEligiblePayment(
  sale: Pick<Sale, 'paymentMethod' | 'paymentSplits'>
): boolean {
  if (sale.paymentSplits?.length) {
    return sale.paymentSplits.some((s) => INVOICE_ELIGIBLE_METHODS.includes(s.method));
  }
  return INVOICE_ELIGIBLE_METHODS.includes(sale.paymentMethod);
}

export function isInvoiceEligibleMethod(method: PaymentMethod | null | undefined): boolean {
  return !!method && INVOICE_ELIGIBLE_METHODS.includes(method);
}

export function buildSalePaymentData(
  methods: PaymentMethod[],
  amounts: number[] | undefined,
  _total: number
): {
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  paymentSplits?: SalePaymentSplit[];
} {
  if (methods.length <= 1) {
    const method = methods[0];
    return {
      paymentMethod: method,
      paymentMethodLabel: getPaymentMethodLabel(method),
    };
  }

  const splits: SalePaymentSplit[] = methods.map((method, i) => ({
    method,
    amount: amounts![i],
    paymentMethodLabel: getPaymentMethodLabel(method),
  }));

  return {
    paymentMethod: methods[0],
    paymentMethodLabel: formatPaymentSplitsLabel(splits),
    paymentSplits: splits,
  };
}
