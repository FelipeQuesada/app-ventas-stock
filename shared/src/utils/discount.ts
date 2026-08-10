import type { DiscountType } from '../types/index';

export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType | null,
  discountValue: number
): number {
  if (!discountType || discountValue <= 0 || subtotal <= 0) return 0;
  if (discountType === 'percent') {
    return Math.min(subtotal, (subtotal * discountValue) / 100);
  }
  return Math.min(subtotal, discountValue);
}

export function calculateSaleTotal(subtotal: number, discountAmount: number): number {
  return Math.max(0, subtotal - discountAmount);
}

export function calculateChange(amountPaid: number, total: number): number {
  return Math.max(0, amountPaid - total);
}
