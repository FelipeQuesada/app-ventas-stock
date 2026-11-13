/** Marca activa en memoria para servicios Firestore / PDFs (seteada por BrandContext). */

type ActiveBrandMeta = {
  id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  email?: string | null;
};

let activeBrandId: string | null = null;
let activeBrandMeta: ActiveBrandMeta | null = null;

export function setActiveBrandId(brandId: string | null) {
  activeBrandId = brandId;
  if (!brandId) activeBrandMeta = null;
  else if (activeBrandMeta && activeBrandMeta.id !== brandId) {
    activeBrandMeta = { id: brandId, name: activeBrandMeta.name };
  }
}

export function setActiveBrandMeta(meta: ActiveBrandMeta | null) {
  activeBrandMeta = meta;
  activeBrandId = meta?.id ?? null;
}

export function getActiveBrandId(): string | null {
  return activeBrandId;
}

export function getActiveBrandName(fallback = 'Advance Coat'): string {
  return activeBrandMeta?.name?.trim() || fallback;
}

export function getActiveBrandWhatsapp(): string | null {
  const wa = activeBrandMeta?.whatsapp?.trim() || activeBrandMeta?.phone?.trim() || '';
  return wa || null;
}

export function getActiveBrandLogoUrl(): string | null {
  return activeBrandMeta?.logoUrl?.trim() || null;
}

export function getActiveBrandEmail(): string | null {
  return activeBrandMeta?.email?.trim() || null;
}

export function requireBrandId(): string {
  if (!activeBrandId) {
    throw new Error('No hay marca activa. Volvé a iniciar sesión.');
  }
  return activeBrandId;
}
