/**
 * Cliente Tiendanube (web).
 *
 * Las credenciales NUNCA van en el front (VITE_* / bundle).
 * Cuando se reactive la sync, el token y store id deben vivir solo en
 * Cloud Functions / secrets de Firebase — el browser llama a esa CF.
 *
 * Hoy la integración está desconectada a propósito.
 */

export interface TiendanubeVariant {
  id: number;
  product_id: number;
  price: string;
  stock: number | null;
  name?: { es?: string };
  sku?: string;
}

export interface TiendanubeProduct {
  id: number;
  name: { es?: string; [lang: string]: string | undefined };
  description: { es?: string; [lang: string]: string | undefined };
  variants: TiendanubeVariant[];
  images: { id: number; src: string }[];
  categories: { id: number; name: { es?: string } }[];
}

export interface SyncStockResult {
  ok: boolean;
  error?: string;
}

const DISABLED_MSG =
  'Tiendanube está desconectada. Las credenciales no se cargan en el navegador; cuando la reactive, van solo en Cloud Functions.';

function assertServerOnly(): never {
  throw new Error(DISABLED_MSG);
}

export async function fetchTiendanubeProducts(): Promise<TiendanubeProduct[]> {
  return assertServerOnly();
}

export async function fetchTiendanubeProduct(_tnId: number): Promise<TiendanubeProduct> {
  return assertServerOnly();
}

export async function updateTiendanubeStock(
  _productId: number,
  _variantId: number,
  _stock: number
): Promise<SyncStockResult> {
  return { ok: false, error: DISABLED_MSG };
}

export async function updateTiendanubePrice(
  _productId: number,
  _variantId: number,
  _price: number
): Promise<SyncStockResult> {
  return { ok: false, error: DISABLED_MSG };
}

export async function updateTiendanubeVariant(
  _productId: number,
  _variantId: number,
  _updates: { stock?: number; price?: number }
): Promise<SyncStockResult> {
  return { ok: false, error: DISABLED_MSG };
}

export function getTiendanubeProductName(p: TiendanubeProduct): string {
  return (
    p.name?.es ??
    Object.values(p.name ?? {}).find(Boolean) ??
    `Producto #${p.id}`
  );
}

export function isTiendanubeConfigured(): boolean {
  return false;
}

export function isTiendanubeEnabled(): boolean {
  return false;
}
