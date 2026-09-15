/** Solo dígitos del CUIT/CUIL (ignora guiones y espacios). */
export function normalizeCuitDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** CUIT/CUIL argentino: exactamente 11 números. */
export function isValidCuitCuil(value: string): boolean {
  return normalizeCuitDigits(value).length === 11;
}

/** Limita la carga a 11 dígitos (permite tipear con guiones mientras). */
export function limitCuitInput(value: string): string {
  const digits = normalizeCuitDigits(value).slice(0, 11);
  // Conservar formato simple XX-XXXXXXXX-X si el usuario escribió guiones
  if (value.includes('-') && digits.length > 2) {
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 10);
    const part3 = digits.slice(10, 11);
    if (digits.length <= 2) return part1;
    if (digits.length <= 10) return `${part1}-${part2}`;
    return `${part1}-${part2}-${part3}`;
  }
  return digits;
}
