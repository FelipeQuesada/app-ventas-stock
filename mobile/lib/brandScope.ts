/** Marca activa en memoria para servicios Firestore (seteada por BrandContext). */

let activeBrandId: string | null = null;

export function setActiveBrandId(brandId: string | null) {
  activeBrandId = brandId;
}

export function getActiveBrandId(): string | null {
  return activeBrandId;
}

export function requireBrandId(): string {
  if (!activeBrandId) {
    throw new Error('No hay marca activa. Volvé a iniciar sesión.');
  }
  return activeBrandId;
}
