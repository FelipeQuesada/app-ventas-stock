import type { Product, Sale } from '../types/index';
import { LOW_STOCK_THRESHOLD } from './stock';

export interface ProductListFilters {
  search: string;
  category: string | null;
  showOutOfStock: boolean;
  showLowStock: boolean;
}

export function getProductSalesCounts(sales: Sale[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.isExtra) continue;
      counts.set(item.productId, (counts.get(item.productId) ?? 0) + item.quantity);
    }
  }

  return counts;
}

function matchesStockFilters(product: Product, filters: ProductListFilters): boolean {
  const { showOutOfStock, showLowStock } = filters;

  if (!showOutOfStock && !showLowStock) return true;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD;

  if (showOutOfStock && showLowStock) {
    return isOutOfStock || isLowStock;
  }

  if (showOutOfStock) return isOutOfStock;
  return isLowStock;
}

export function filterAndSortProducts(
  products: Product[],
  filters: ProductListFilters,
  salesCounts: Map<string, number>
): Product[] {
  const term = filters.search.toLowerCase().trim();

  const filtered = products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (!matchesStockFilters(product, filters)) return false;
    if (!term) return true;

    return (
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term)
    );
  });

  return filtered.sort((a, b) => {
    const aOutOfStock = a.stock <= 0;
    const bOutOfStock = b.stock <= 0;
    if (aOutOfStock !== bOutOfStock) {
      return aOutOfStock ? 1 : -1;
    }

    const aSales = salesCounts.get(a.id) ?? 0;
    const bSales = salesCounts.get(b.id) ?? 0;
    if (aSales !== bSales) {
      return bSales - aSales;
    }

    return a.name.localeCompare(b.name, 'es');
  });
}

export function getUniqueProductCategories(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

export function filterProductsForSale(
  products: Product[],
  filters: ProductListFilters,
  salesCounts: Map<string, number>,
  getAvailableStock: (productId: string) => number
): Product[] {
  const availableProducts = products.filter((product) => getAvailableStock(product.id) > 0);
  return filterAndSortProducts(availableProducts, filters, salesCounts);
}

export function hasActiveProductBrowse(filters: ProductListFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.category !== null ||
    filters.showLowStock
  );
}
