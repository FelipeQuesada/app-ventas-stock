import type { SaleItem } from '../types/index';

export function isExtraItem(item: SaleItem): boolean {
  return item.isExtra === true || item.productId.startsWith('extra-');
}

export function aggregateProductQuantities(items: SaleItem[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (isExtraItem(item)) continue;
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return quantities;
}

export function createExtraItem(description: string, quantity: number, unitPrice: number): SaleItem {
  return {
    productId: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productName: description.trim(),
    category: 'Extra',
    quantity,
    unitPrice,
    subtotal: unitPrice * quantity,
    isExtra: true,
  };
}
