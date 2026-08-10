export const PRODUCT_CATEGORIES = [
  'Revestimientos',
  'Herramientas',
  'Accesorios',
  'Químicos',
  'Equipamiento',
  'Otros',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
