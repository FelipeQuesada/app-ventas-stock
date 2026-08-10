import type { Product, StockLevel } from '../types/index';

export const LOW_STOCK_THRESHOLD = 10;

export function getStockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'empty';
  if (stock < LOW_STOCK_THRESHOLD) return 'low';
  return 'high';
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products
    .filter((p) => p.stock < LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock);
}

export function getStockColor(level: StockLevel): string {
  switch (level) {
    case 'high':
      return '#10B981';
    case 'low':
      return '#F59E0B';
    case 'empty':
      return '#EF4444';
  }
}

export function getStockLabel(level: StockLevel): string {
  switch (level) {
    case 'high':
      return 'Stock OK';
    case 'low':
      return 'Poco stock';
    case 'empty':
      return 'Sin stock';
  }
}
