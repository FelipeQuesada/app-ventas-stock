import { formatCurrency, formatDate } from './format';

/** Utilidades puras de caja — fáciles de testear */

/** Teléfono fijo para reportes de caja por WhatsApp */
export const CAJA_WHATSAPP_PHONE = '1157715316';

/** Dinero físico en caja: ventas efectivo del día + cambio de apertura */
export function calculateCajaTotal(cashSales: number, cajaCambio: number): number {
  return cashSales + cajaCambio;
}

/** Cierre sin movimiento: el cambio de apertura queda igual para mañana */
export function buildSinMovimientoCaja(cajaCambio: number) {
  return {
    cajaCambio,
    cajaTotal: cajaCambio,
    totalGuardado: 0,
    ganancia: 0,
    cambioCierre: cajaCambio,
    sinMovimiento: true as const,
  };
}

/** Ganancia del día = lo que entró por ventas (caja total − cambio de apertura) */
export function calculateCajaGanancia(cajaTotal: number, cajaCambio: number): number {
  return cajaTotal - cajaCambio;
}

export function calculateCambioCierre(cajaTotal: number, totalGuardado: number): number {
  return cajaTotal - totalGuardado;
}

export function canSaveToCentral(amount: number, availableInCaja: number): boolean {
  return amount > 0 && amount <= availableInCaja;
}

export function canWithdraw(amount: number, totalGuardado: number): boolean {
  return amount > 0 && amount <= totalGuardado;
}

export interface CajaCierreMessageInput {
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  ganancia: number;
  totalGuardado: number;
  cambioCierre: number;
  sinMovimiento?: boolean;
  closedByName?: string;
}

export function buildCajaCierreMessage(input: CajaCierreMessageInput): string {
  const lines = ['*Cierre de caja*', formatDate(input.date), ''];

  if (input.sinMovimiento) {
    lines.push('Sin movimiento de caja');
    lines.push(`Cambio caja: ${formatCurrency(input.cajaCambio)}`);
    lines.push(`Dejo en caja: ${formatCurrency(input.cambioCierre)}`);
    if (input.closedByName) lines.push(`Cerró: ${input.closedByName}`);
    return lines.join('\n');
  }

  lines.push(`Cambio caja: ${formatCurrency(input.cajaCambio)}`);
  lines.push(`Caja total: ${formatCurrency(input.cajaTotal)}`);
  lines.push(`Ganancia: ${formatCurrency(input.ganancia)}`);
  lines.push('');
  lines.push(`Guardo: ${formatCurrency(input.totalGuardado)}`);
  lines.push(`Dejo en caja: ${formatCurrency(input.cambioCierre)}`);
  if (input.closedByName) lines.push(`Cerró: ${input.closedByName}`);
  return lines.join('\n');
}

export interface CajaRetiroMessageInput {
  date: Date;
  amount: number;
  totalGuardado: number;
  actorName?: string;
}

export function buildCajaRetiroMessage(input: CajaRetiroMessageInput): string {
  const lines = [
    '*Retiro de caja central*',
    formatDate(input.date),
    '',
    `Retiré: ${formatCurrency(input.amount)}`,
    `Queda en central: ${formatCurrency(input.totalGuardado)}`,
  ];
  if (input.actorName) lines.push(`Retiró: ${input.actorName}`);
  return lines.join('\n');
}
