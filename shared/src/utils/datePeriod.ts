import {
  startOfDay,
  endOfDay,
  subDays,
  subYears,
  startOfMonth,
  isWithinInterval,
  format,
  differenceInCalendarDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodPresetId =
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_15'
  | 'last_month'
  | 'last_year'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PeriodSelection {
  preset: PeriodPresetId;
  range: DateRange;
}

export const PERIOD_PRESETS: { id: Exclude<PeriodPresetId, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'last_week', label: 'Última semana' },
  { id: 'last_15', label: 'Últimos 15 días' },
  { id: 'last_month', label: 'Mes actual' },
  { id: 'last_year', label: 'Último año' },
];

export function getPresetRange(preset: Exclude<PeriodPresetId, 'custom'>, now = new Date()): DateRange {
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday': {
      const day = subDays(today, 1);
      return { start: day, end: endOfDay(day) };
    }
    case 'last_week':
      return { start: startOfDay(subDays(today, 6)), end: endOfDay(now) };
    case 'last_15':
      return { start: startOfDay(subDays(today, 14)), end: endOfDay(now) };
    case 'last_month':
      // Mes calendario actual (día 1 → hoy), no “últimos 30 días”
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'last_year':
      return { start: startOfDay(subYears(today, 1)), end: endOfDay(now) };
    default:
      return { start: today, end: endOfDay(now) };
  }
}

export function createDefaultPeriod(now = new Date()): PeriodSelection {
  return {
    preset: 'last_month',
    range: getPresetRange('last_month', now),
  };
}

export function isDateInRange(date: Date, range: DateRange): boolean {
  return isWithinInterval(date, {
    start: startOfDay(range.start),
    end: endOfDay(range.end),
  });
}

export function formatPeriodLabel(selection: PeriodSelection): string {
  if (selection.preset !== 'custom') {
    const found = PERIOD_PRESETS.find((p) => p.id === selection.preset);
    if (found) return found.label;
  }

  const { start, end } = selection.range;
  const sameDay = differenceInCalendarDays(end, start) === 0;
  if (sameDay) {
    return format(start, "d 'de' MMMM yyyy", { locale: es });
  }
  return `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')}`;
}

export function normalizeRange(a: Date, b: Date): DateRange {
  const start = startOfDay(a <= b ? a : b);
  const end = endOfDay(a <= b ? b : a);
  return { start, end };
}

/** Período inmediatamente anterior, con la misma cantidad de días. */
export function getPrecedingRange(range: DateRange): DateRange {
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);
  const days = differenceInCalendarDays(end, start) + 1;
  const prevEnd = endOfDay(subDays(start, 1));
  const prevStart = startOfDay(subDays(start, days));
  return { start: prevStart, end: prevEnd };
}

/** Mismo rango calendario, un año atrás. */
export function getSameRangeLastYear(range: DateRange): DateRange {
  return {
    start: startOfDay(subYears(range.start, 1)),
    end: endOfDay(subYears(range.end, 1)),
  };
}

export function formatDateRangeLabel(range: DateRange): string {
  const { start, end } = range;
  const sameDay = differenceInCalendarDays(end, start) === 0;
  if (sameDay) {
    return format(start, "d 'de' MMMM yyyy", { locale: es });
  }
  return `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')}`;
}

