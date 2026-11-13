import { DEFAULT_BRAND_ID } from './platform';

/** Vendedores fijos de Advance Coat (legacy) */
export const SALE_SELLERS = [
  'Martin',
  'Bruno',
  'Paula',
  'Felipe',
  'Joaquin',
  'Mateo',
] as const;

export type SaleSeller = (typeof SALE_SELLERS)[number];

export function isAdvanceBrand(brandId?: string | null): boolean {
  return (brandId ?? '') === DEFAULT_BRAND_ID;
}

/** Nombres de vendedor según marca: Advance = lista fija; resto = usuarios activos. */
export function getSellerNamesForBrand(input: {
  brandId?: string | null;
  users?: Array<{ name?: string; active?: boolean; pendingApproval?: boolean }>;
}): string[] {
  if (isAdvanceBrand(input.brandId)) {
    return [...SALE_SELLERS];
  }

  const names = (input.users ?? [])
    .filter((u) => u.active !== false && u.pendingApproval !== true)
    .map((u) => (u.name ?? '').trim())
    .filter(Boolean);

  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es'));
}
