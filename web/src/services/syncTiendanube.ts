/**
 * Sincronización Tiendanube ↔ app.
 *
 * REGLAS (acordadas):
 * 1. NUNCA borrar productos en Tiendanube desde esta app.
 * 2. App → TN: solo stock (cuando vendés en el local).
 * 3. TN → App: nombre, precio, descripción, imagen, altas y bajas (ocultar, no borrar).
 * 4. Matching por tiendanubeId (no por nombre) para no duplicar al renombrar.
 */

import type { Product } from '@advance-coat/shared';
import { createProduct, updateProduct, getProducts } from './products';
import {
  fetchTiendanubeProducts,
  getTiendanubeProductName,
  updateTiendanubeStock,
  type TiendanubeProduct,
} from './tiendanube';

export interface PullFromTnResult {
  created: number;
  updated: number;
  hidden: number;
  unchanged: number;
  errors: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapTnToLocalFields(tn: TiendanubeProduct): {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  tiendanubeId: number;
  tiendanubeVariantId: number;
  hidden: boolean;
} {
  const variant = tn.variants[0];
  if (!variant) {
    throw new Error(`Producto TN #${tn.id} sin variantes`);
  }

  const categoryName =
    tn.categories?.[0]?.name?.es ??
    Object.values(tn.categories?.[0]?.name ?? {}).find(Boolean) ??
    'Tiendanube';

  return {
    name: getTiendanubeProductName(tn),
    description: stripHtml(
      tn.description?.es ?? Object.values(tn.description ?? {}).find(Boolean) ?? ''
    ),
    price: Number.parseFloat(variant.price) || 0,
    stock: typeof variant.stock === 'number' ? variant.stock : 0,
    imageUrl: tn.images?.[0]?.src ?? '',
    category: categoryName,
    tiendanubeId: tn.id,
    tiendanubeVariantId: variant.id,
    hidden: false,
  };
}

/**
 * Trae el catálogo de Tiendanube y actualiza Firestore.
 * - Si existe por tiendanubeId → actualiza nombre/precio/stock/etc y lo desoculta
 * - Si es nuevo → lo crea
 * - Si un producto local tenía tiendanubeId y ya no está en TN → se oculta (NO se borra)
 *
 * Nunca llama a DELETE en la API de Tiendanube.
 */
export async function pullCatalogFromTiendanube(
  onProgress?: (done: number, total: number, message: string) => void
): Promise<PullFromTnResult> {
  const result: PullFromTnResult = {
    created: 0,
    updated: 0,
    hidden: 0,
    unchanged: 0,
    errors: [],
  };

  const [tnProducts, localProducts] = await Promise.all([
    fetchTiendanubeProducts(),
    getProducts(),
  ]);

  const localByTnId = new Map<number, Product>();
  for (const p of localProducts) {
    if (typeof p.tiendanubeId === 'number') {
      localByTnId.set(p.tiendanubeId, p);
    }
  }

  const seenTnIds = new Set<number>();
  const total = tnProducts.length + localProducts.filter((p) => p.tiendanubeId).length;
  let done = 0;

  for (const tn of tnProducts) {
    seenTnIds.add(tn.id);
    done++;
    try {
      if (!tn.variants?.[0]) {
        result.errors.push(`TN #${tn.id} sin variantes — omitido`);
        onProgress?.(done, total, `Omitido #${tn.id}`);
        continue;
      }

      const fields = mapTnToLocalFields(tn);
      const existing = localByTnId.get(tn.id);

      if (existing) {
        const changed =
          existing.name !== fields.name ||
          existing.price !== fields.price ||
          existing.stock !== fields.stock ||
          existing.description !== fields.description ||
          existing.imageUrl !== fields.imageUrl ||
          existing.category !== fields.category ||
          existing.tiendanubeVariantId !== fields.tiendanubeVariantId ||
          existing.hidden === true;

        if (changed) {
          await updateProduct(existing.id, fields);
          result.updated++;
          onProgress?.(done, total, `Actualizado: ${fields.name}`);
        } else {
          result.unchanged++;
          onProgress?.(done, total, `Sin cambios: ${fields.name}`);
        }
      } else {
        await createProduct(fields);
        result.created++;
        onProgress?.(done, total, `Creado: ${fields.name}`);
      }
    } catch (e) {
      result.errors.push(`TN #${tn.id}: ${(e as Error).message}`);
      onProgress?.(done, total, `Error en #${tn.id}`);
    }
  }

  // Ocultar locales vinculados que ya no están en TN (no borrar)
  for (const local of localProducts) {
    if (typeof local.tiendanubeId !== 'number') continue;
    done++;
    if (seenTnIds.has(local.tiendanubeId)) continue;
    if (local.hidden) {
      result.unchanged++;
      continue;
    }
    try {
      await updateProduct(local.id, { hidden: true });
      result.hidden++;
      onProgress?.(done, total, `Ocultado: ${local.name}`);
    } catch (e) {
      result.errors.push(`${local.name}: ${(e as Error).message}`);
    }
  }

  return result;
}

/**
 * App → TN: SOLO stock. Nunca borra ni crea productos en Tiendanube.
 */
export async function pushStockToTiendanube(
  product: Product
): Promise<{ ok: boolean; error?: string }> {
  if (!product.tiendanubeId || !product.tiendanubeVariantId) {
    return { ok: false, error: 'Producto no vinculado a Tiendanube' };
  }
  return updateTiendanubeStock(product.tiendanubeId, product.tiendanubeVariantId, product.stock);
}

export async function pushAllLinkedStockToTiendanube(
  products: Product[],
  onProgress?: (done: number, total: number) => void
): Promise<{ synced: number; errors: number; skipped: number }> {
  const linked = products.filter(
    (p) => p.tiendanubeId && p.tiendanubeVariantId && !p.hidden
  );
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < linked.length; i++) {
    const res = await pushStockToTiendanube(linked[i]);
    if (res.ok) synced++;
    else errors++;
    onProgress?.(i + 1, linked.length);
  }

  return {
    synced,
    errors,
    skipped: products.length - linked.length,
  };
}

export {
  fetchTiendanubeProducts,
  getTiendanubeProductName,
  type TiendanubeProduct,
};
