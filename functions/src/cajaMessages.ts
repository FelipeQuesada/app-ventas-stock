/** Replica de shared buildCajaCierreMessage / buildCajaRetiroMessage */

type TimestampLike = { toDate?: () => Date } | Date | string | null | undefined;

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function toDate(value: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1;
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  return `${day} de ${MONTHS_ES[month]}, ${year}`;
}

export type CajaDocLike = {
  entryType?: string;
  date?: TimestampLike;
  cajaCambio?: number;
  cajaTotal?: number;
  ganancia?: number;
  totalGuardado?: number;
  cambioCierre?: number;
  sinMovimiento?: boolean;
  closedByName?: string;
  retiroAmount?: number;
  balanceAfter?: number;
  telegramEventId?: string;
};

export function buildCajaCierreText(doc: CajaDocLike): string {
  const date = toDate(doc.date);
  const lines = ['*Cierre de caja*', date ? formatDate(date) : '-', ''];

  if (doc.sinMovimiento) {
    lines.push('Sin movimiento de caja');
    lines.push(`Cambio caja: ${formatCurrency(doc.cajaCambio ?? 0)}`);
    lines.push(`Dejo en caja: ${formatCurrency(doc.cambioCierre ?? 0)}`);
    if (doc.closedByName) lines.push(`Cerró: ${doc.closedByName}`);
    return lines.join('\n');
  }

  lines.push(`Cambio caja: ${formatCurrency(doc.cajaCambio ?? 0)}`);
  lines.push(`Caja total: ${formatCurrency(doc.cajaTotal ?? 0)}`);
  lines.push(`Ganancia: ${formatCurrency(doc.ganancia ?? 0)}`);
  lines.push('');
  lines.push(`Guardo: ${formatCurrency(doc.totalGuardado ?? 0)}`);
  lines.push(`Dejo en caja: ${formatCurrency(doc.cambioCierre ?? 0)}`);
  if (doc.closedByName) lines.push(`Cerró: ${doc.closedByName}`);
  return lines.join('\n');
}

export function buildCajaRetiroText(doc: CajaDocLike): string {
  const date = toDate(doc.date);
  const lines = [
    '*Retiro de caja central*',
    date ? formatDate(date) : '-',
    '',
    `Retiré: ${formatCurrency(doc.retiroAmount ?? 0)}`,
    `Queda en central: ${formatCurrency(doc.balanceAfter ?? 0)}`,
  ];
  if (doc.closedByName) lines.push(`Retiró: ${doc.closedByName}`);
  return lines.join('\n');
}
