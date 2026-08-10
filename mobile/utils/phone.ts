/** Clave de teléfono AR para identificar clientes (últimos 10 dígitos sin código país). */
export function normalizePhoneKey(phone: string | undefined | null): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('549')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('54')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('9') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('15') && digits.length >= 10) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits.length >= 8 ? digits : null;
}

export function phonesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const keyA = normalizePhoneKey(a);
  const keyB = normalizePhoneKey(b);
  return !!keyA && !!keyB && keyA === keyB;
}
