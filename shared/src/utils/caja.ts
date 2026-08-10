/** Utilidades puras de caja — fáciles de testear */
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
