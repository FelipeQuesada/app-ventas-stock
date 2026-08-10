export const SALE_SELLERS = [
  'Martin',
  'Bruno',
  'Paula',
  'Felipe',
  'Joaquin',
  'Mateo',
] as const;

export type SaleSeller = (typeof SALE_SELLERS)[number];
