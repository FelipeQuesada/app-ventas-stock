/**
 * Lógica de sincronización batch entre los productos de la app y Tiendanube.
 *
 * La sincronización es UNIDIRECCIONAL: tu app → Tiendanube.
 * Solo actualiza los productos que tienen tiendanubeId vinculado.
 */

import type { Product } from '@advance-coat/shared';
import { updateProduct } from './products';
import {
  updateTiendanubeVariant,
  fetchTiendanubeProducts,
  getTiendanubeProductName,
  type TiendanubeProduct,
  type SyncStockResult,
} from './tiendanube';

export type SyncField = 'stock' | 'price' | 'both';

export interface SyncProductResult {
  productId: string;
  productName: string;
  tiendanubeId: number;
  field: SyncField;
  ok: boolean;
  error?: string;
}

export interface SyncBatchResult {
  synced: number;
  errors: number;
  skipped: number;
  results: SyncProductResult[];
}

/**
 * Sincroniza stock y/o precio de todos los productos vinculados a Tiendanube.
 *
 * @param products  Lista de productos de tu app (solo los que tienen tiendanubeId se sincronizan)
 * @param field     Qué sincronizar: 'stock' | 'price' | 'both'
 * @param onProgress  Callback opcional que se llama después de cada producto
 */
export async function syncAllToTiendanube(
  products: Product[],
  field: SyncField = 'both',
  onProgress?: (done: number, total: number, last: SyncProductResult) => void
): Promise<SyncBatchResult> {
  const linked = products.filter((p) => p.tiendanubeId && p.tiendanubeVariantId);

  const result: SyncBatchResult = {
    synced: 0,
    errors: 0,
    skipped: products.length - linked.length,
    results: [],
  };

  for (let i = 0; i < linked.length; i++) {
    const product = linked[i];
    const updates: { stock?: number; price?: number } = {};
    if (field === 'stock' || field === 'both') updates.stock = product.stock;
    if (field === 'price' || field === 'both') updates.price = product.price;

    const res: SyncStockResult = await updateTiendanubeVariant(
      product.tiendanubeId!,
      product.tiendanubeVariantId!,
      updates
    );

    const item: SyncProductResult = {
      productId: product.id,
      productName: product.name,
      tiendanubeId: product.tiendanubeId!,
      field,
      ok: res.ok,
      error: res.error,
    };

    result.results.push(item);
    if (res.ok) result.synced++;
    else result.errors++;

    onProgress?.(i + 1, linked.length, item);
  }

  return result;
}

/**
 * Vincula un producto local con un producto de Tiendanube.
 * Guarda tiendanubeId y tiendanubeVariantId en Firestore.
 *
 * Usa la primera variante del producto de Tiendanube (asume sin variantes múltiples).
 */
export async function linkProductToTiendanube(
  localProductId: string,
  tnProduct: TiendanubeProduct
): Promise<void> {
  const defaultVariant = tnProduct.variants[0];
  if (!defaultVariant) throw new Error('El producto de Tiendanube no tiene variantes');

  await updateProduct(localProductId, {
    tiendanubeId: tnProduct.id,
    tiendanubeVariantId: defaultVariant.id,
  });
}

/**
 * Desvincula un producto local de Tiendanube (borra los IDs guardados).
 */
export async function unlinkProductFromTiendanube(localProductId: string): Promise<void> {
  // Firestore acepta undefined para borrar campos; usamos null para limpiar
  await updateProduct(localProductId, {
    tiendanubeId: undefined,
    tiendanubeVariantId: undefined,
  });
}

/**
 * Estadísticas rápidas sobre el estado de la vinculación.
 */
export interface LinkStats {
  total: number;
  linked: number;
  unlinked: number;
  linkPercent: number;
}

export function getLinkStats(products: Product[]): LinkStats {
  const linked = products.filter((p) => p.tiendanubeId).length;
  return {
    total: products.length,
    linked,
    unlinked: products.length - linked,
    linkPercent: products.length > 0 ? Math.round((linked / products.length) * 100) : 0,
  };
}

/**
 * Busca el nombre del producto de Tiendanube más parecido al local.
 * Útil para sugerir vinculaciones automáticas durante el setup inicial.
 */
export function suggestTiendanubeMatch(
  localName: string,
  tnProducts: TiendanubeProduct[]
): TiendanubeProduct | undefined {
  const needle = localName.toLowerCase().trim();

  // Coincidencia exacta
  const exact = tnProducts.find(
    (p) => getTiendanubeProductName(p).toLowerCase().trim() === needle
  );
  if (exact) return exact;

  // Coincidencia parcial (el nombre local contiene el de TN o viceversa)
  return tnProducts.find((p) => {
    const tnName = getTiendanubeProductName(p).toLowerCase().trim();
    return tnName.includes(needle) || needle.includes(tnName);
  });
}

export { fetchTiendanubeProducts, getTiendanubeProductName };
