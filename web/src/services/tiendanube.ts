/**
 * Servicio para comunicarse con la API de Tiendanube.
 *
 * Variables de entorno necesarias en web/.env:
 *   VITE_TIENDANUBE_STORE_ID   — ID numérico de la tienda (ej: 1234567)
 *   VITE_TIENDANUBE_TOKEN      — Access token de Tiendanube
 *
 * Cómo obtener el token:
 *   Panel Tiendanube → Configuración → Aplicaciones → API → Crear token de acceso
 *   O pedirlo desde la sección "Mis aplicaciones" si usás partner.
 */

const STORE_ID = import.meta.env.VITE_TIENDANUBE_STORE_ID as string;
const TOKEN = import.meta.env.VITE_TIENDANUBE_TOKEN as string;
const BASE_URL = `https://api.tiendanube.com/v1/${STORE_ID}`;

/** Headers requeridos por Tiendanube */
function headers(): HeadersInit {
  return {
    Authentication: `bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'AdvanceCoatApp/1.0',
  };
}

async function tnFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tiendanube API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Tipos de respuesta de la API ────────────────────────────────────────────

export interface TiendanubeVariant {
  id: number;
  product_id: number;
  price: string;      // viene como string, ej "1500.00"
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

export interface TiendanubePage<T> {
  items: T[];
  nextPage?: string | null;
}

// ─── Leer productos de Tiendanube ─────────────────────────────────────────────

/** Devuelve TODOS los productos de la tienda, paginando automáticamente */
export async function fetchTiendanubeProducts(): Promise<TiendanubeProduct[]> {
  if (!STORE_ID || !TOKEN) {
    throw new Error(
      'Configurá VITE_TIENDANUBE_STORE_ID y VITE_TIENDANUBE_TOKEN en web/.env'
    );
  }

  const all: TiendanubeProduct[] = [];
  let page = 1;

  while (true) {
    const batch = await tnFetch<TiendanubeProduct[]>(
      `/products?per_page=200&page=${page}&fields=id,name,description,variants,images,categories`
    );
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }

  return all;
}

/** Obtiene un producto específico de Tiendanube */
export async function fetchTiendanubeProduct(tnId: number): Promise<TiendanubeProduct> {
  return tnFetch<TiendanubeProduct>(`/products/${tnId}`);
}

// ─── Actualizar stock ─────────────────────────────────────────────────────────

export interface SyncStockResult {
  ok: boolean;
  error?: string;
}

/** Actualiza el stock de una variante en Tiendanube */
export async function updateTiendanubeStock(
  productId: number,
  variantId: number,
  stock: number
): Promise<SyncStockResult> {
  try {
    await tnFetch(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ stock }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Actualizar precio ────────────────────────────────────────────────────────

/** Actualiza el precio de una variante en Tiendanube */
export async function updateTiendanubePrice(
  productId: number,
  variantId: number,
  price: number
): Promise<SyncStockResult> {
  try {
    await tnFetch(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ price: price.toFixed(2) }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Actualiza stock Y precio de una variante en una sola llamada */
export async function updateTiendanubeVariant(
  productId: number,
  variantId: number,
  updates: { stock?: number; price?: number }
): Promise<SyncStockResult> {
  try {
    const body: Record<string, unknown> = {};
    if (updates.stock !== undefined) body.stock = updates.stock;
    if (updates.price !== undefined) body.price = updates.price.toFixed(2);
    await tnFetch(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devuelve el nombre español de un producto de Tiendanube, o el primero disponible */
export function getTiendanubeProductName(p: TiendanubeProduct): string {
  return (
    p.name?.es ??
    Object.values(p.name ?? {}).find(Boolean) ??
    `Producto #${p.id}`
  );
}

/** Indica si están configuradas las variables de entorno de Tiendanube */
export function isTiendanubeConfigured(): boolean {
  return Boolean(STORE_ID && TOKEN);
}
