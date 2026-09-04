import {
  startOfDay,
  subDays,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  subMonths,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Sale, Product } from '@/types';
import { getPaymentMethodLabel, getSalePaymentLabel } from '@/constants/payments';

export interface DailySalesData {
  label: string;
  value: number;
  count: number;
}

export interface ProductSalesData {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentStatsData {
  label: string;
  value: number;
  color: string;
}

export interface CategorySalesData {
  label: string;
  value: number;
}

export interface MonthlyComparison {
  label: string;
  revenue: number;
  salesCount: number;
  customers: number;
}

const CHART_COLORS = [
  '#E94560',
  '#1A1A2E',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#EC4899',
  '#14B8A6',
  '#8B5CF6',
];

export function getDailySalesChart(sales: Sale[], days = 30): DailySalesData[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const daySales = sales.filter(
      (s) => startOfDay(s.date).getTime() === day.getTime()
    );
    return {
      label: format(day, 'dd/MM', { locale: es }),
      value: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length,
    };
  });
}

export function getMonthlySalesChart(sales: Sale[], months = 12): DailySalesData[] {
  const end = startOfMonth(new Date());
  const start = subMonths(end, months - 1);
  const interval = eachMonthOfInterval({ start, end });

  return interval.map((month) => {
    const monthSales = sales.filter((s) => isSameMonth(s.date, month));
    return {
      label: format(month, 'MMM yy', { locale: es }),
      value: monthSales.reduce((sum, s) => sum + s.total, 0),
      count: monthSales.length,
    };
  });
}

export function getTopProducts(sales: Sale[], limit = 5, ascending = false): ProductSalesData[] {
  const map = new Map<string, ProductSalesData>();

  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = map.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.subtotal;
      map.set(item.productId, existing);
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) =>
    ascending ? a.quantity - b.quantity : b.quantity - a.quantity
  );

  return sorted.slice(0, limit);
}

export function getPaymentMethodStats(sales: Sale[]): PaymentStatsData[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    if (sale.paymentSplits?.length) {
      for (const split of sale.paymentSplits) {
        const label = split.paymentMethodLabel ?? getPaymentMethodLabel(split.method);
        map.set(label, (map.get(label) ?? 0) + 1);
      }
      continue;
    }
    const label = getSalePaymentLabel(sale);
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

export function getPaymentMethodRevenueStats(sales: Sale[]): PaymentStatsData[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    if (sale.paymentSplits?.length) {
      for (const split of sale.paymentSplits) {
        const label = split.paymentMethodLabel ?? getPaymentMethodLabel(split.method);
        map.set(label, (map.get(label) ?? 0) + split.amount);
      }
      continue;
    }
    const label = getSalePaymentLabel(sale);
    map.set(label, (map.get(label) ?? 0) + sale.total);
  }

  return Array.from(map.entries())
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);
}

export function getProductRevenueChart(sales: Sale[], limit = 8): ProductSalesData[] {
  return getTopProducts(sales, 100)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getCategoryStats(sales: Sale[]): CategorySalesData[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    for (const item of sale.items) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.quantity);
    }
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getMonthlyRevenue(sales: Sale[], date = new Date()): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return sales
    .filter((s) => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + s.total, 0);
}

export function getAnnualRevenue(sales: Sale[], year = new Date().getFullYear()): number {
  return sales
    .filter((s) => s.date.getFullYear() === year)
    .reduce((sum, s) => sum + s.total, 0);
}

export function getTotalCustomers(sales: Sale[]): number {
  return sales.reduce((sum, s) => sum + s.customerCount, 0);
}

export function getAverageTicket(sales: Sale[]): number {
  if (sales.length === 0) return 0;
  return sales.reduce((sum, s) => sum + s.total, 0) / sales.length;
}

export function getTotalUnitsSold(sales: Sale[]): number {
  return sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
}

export function getSellerRevenueStats(sales: Sale[]): CategorySalesData[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    const label = sale.createdByName?.trim() || 'Sin vendedor';
    map.set(label, (map.get(label) ?? 0) + sale.total);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function truncateLabel(label: string, max = 28): string {
  const cleaned = label.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export function getMonthlyComparison(sales: Sale[], months = 6): MonthlyComparison[] {
  const end = startOfMonth(new Date());
  const start = subMonths(end, months - 1);
  const interval = eachMonthOfInterval({ start, end });

  return interval.map((month) => {
    const monthSales = sales.filter((s) => isSameMonth(s.date, month));
    return {
      label: format(month, 'MMM yyyy', { locale: es }),
      revenue: monthSales.reduce((sum, s) => sum + s.total, 0),
      salesCount: monthSales.length,
      customers: monthSales.reduce((sum, s) => sum + s.customerCount, 0),
    };
  });
}

export function getCategoryRevenueStats(sales: Sale[]): CategorySalesData[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    for (const item of sale.items) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.subtotal);
    }
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export interface StockCategoryData {
  label: string;
  stock: number;
  products: number;
}

export function getStockByCategory(products: Product[]): StockCategoryData[] {
  const map = new Map<string, { stock: number; products: number }>();

  for (const product of products) {
    const existing = map.get(product.category) ?? { stock: 0, products: 0 };
    existing.stock += product.stock;
    existing.products += 1;
    map.set(product.category, existing);
  }

  return Array.from(map.entries())
    .map(([label, data]) => ({ label, stock: data.stock, products: data.products }))
    .sort((a, b) => b.stock - a.stock);
}

export function getStockLevelStats(products: Product[]): PaymentStatsData[] {
  const high = products.filter((p) => p.stock >= 10).length;
  const low = products.filter((p) => p.stock > 0 && p.stock < 10).length;
  const empty = products.filter((p) => p.stock === 0).length;

  return [
    { label: 'Stock alto (≥10)', value: high, color: CHART_COLORS[2] },
    { label: 'Bajo stock (<10)', value: low, color: CHART_COLORS[3] },
    { label: 'Sin stock', value: empty, color: CHART_COLORS[0] },
  ].filter((item) => item.value > 0);
}

export function getLowStockRanking(products: Product[], limit = 6): ProductSalesData[] {
  return products
    .filter((p) => p.stock < 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit)
    .map((p) => ({ name: p.name, quantity: p.stock, revenue: p.price * p.stock }));
}

export function getDailyRevenueInMonth(sales: Sale[], month: Date): DailySalesData[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const daySales = sales.filter(
      (s) => startOfDay(s.date).getTime() === startOfDay(day).getTime()
    );
    return {
      label: format(day, 'd', { locale: es }),
      value: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length,
    };
  });
}

export function getDailyRevenueInRange(sales: Sale[], start: Date, end: Date): DailySalesData[] {
  const interval = eachDayOfInterval({
    start: startOfDay(start),
    end: startOfDay(end),
  });
  const compactLabels = interval.length > 20;

  return interval.map((day) => {
    const daySales = sales.filter(
      (s) => startOfDay(s.date).getTime() === day.getTime()
    );
    return {
      label: format(day, compactLabels ? 'd/M' : 'dd/MM', { locale: es }),
      value: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length,
    };
  });
}

export { CHART_COLORS };
