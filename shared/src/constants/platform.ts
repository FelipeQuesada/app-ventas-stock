/** Plataforma Control+ */

/** Marca legacy migrada (Advance Coat) */
export const DEFAULT_BRAND_ID = 'advance-coat';

/** Super admin de la plataforma (gestiona todas las marcas) */
export const SUPER_ADMIN_EMAIL = 'felimq09@gmail.com';

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
