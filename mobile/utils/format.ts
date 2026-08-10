import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd/MM/yyyy', { locale: es });
}

/** Fecha + hora para listados de ventas. */
export function formatShortDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd/MM/yyyy · HH:mm', { locale: es });
}

/**
 * Fecha de venta para mostrar: si `date` está a 00:00, combina el día con la hora de `createdAt`.
 */
export function getSaleDisplayDate(sale: { date: Date; createdAt?: Date }): Date {
  const d = sale.date instanceof Date ? sale.date : new Date(sale.date);
  if (!isValid(d)) return d;

  const midnight =
    d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

  if (midnight && sale.createdAt && isValid(sale.createdAt)) {
    const merged = new Date(d);
    merged.setHours(
      sale.createdAt.getHours(),
      sale.createdAt.getMinutes(),
      sale.createdAt.getSeconds(),
      sale.createdAt.getMilliseconds()
    );
    return merged;
  }

  return d;
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: es });
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
