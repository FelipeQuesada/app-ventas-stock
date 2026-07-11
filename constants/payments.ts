import { PaymentMethod } from '@/types';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'transferencia_feli', label: 'Transferencia Feli', icon: 'account-balance' },
  { value: 'transferencia_mateo', label: 'Transferencia Mateo', icon: 'account-balance' },
  { value: 'transferencia_paula', label: 'Transferencia Paula', icon: 'account-balance' },
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
