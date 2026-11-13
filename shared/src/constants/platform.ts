/** Plataforma Control+ */

/** Marca legacy migrada (Advance Coat) */
export const DEFAULT_BRAND_ID = 'advance-coat';

/** Super admin de la plataforma (gestiona todas las marcas) */
export const SUPER_ADMIN_EMAIL = 'felimq09@gmail.com';

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código corto de marca para registro de empleados (ej. K7M2QX) */
export function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
