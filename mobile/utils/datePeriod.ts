import {
  startOfDay,
  endOfDay,
  subDays,
  subYears,
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
  { id: 'last_month', label: 'Último mes' },
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
      return { start: startOfDay(subDays(today, 29)), end: endOfDay(now) };
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
