import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Brand } from '@advance-coat/shared';
import {
  DEFAULT_BRAND_ID,
  getPlanLimits,
  isBrandAdminRole,
  isSuperAdminRole,
  type PlanLimits,
} from '@advance-coat/shared';
import { useAuth } from './AuthContext';
import { getBrand } from '../services/brands';
import { setActiveBrandId, setActiveBrandMeta } from '../lib/brandScope';
import { invalidateProductsCache } from '../services/products';

const BRAND_SESSION_KEY = 'controlplus.activeBrandId';

function readStoredBrandId(): string | null {
  try {
    return sessionStorage.getItem(BRAND_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStoredBrandId(brandId: string | null) {
  try {
    if (brandId) sessionStorage.setItem(BRAND_SESSION_KEY, brandId);
    else sessionStorage.removeItem(BRAND_SESSION_KEY);
  } catch {
    // ignore (modo privado / storage bloqueado)
  }
}

interface BrandContextType {
  brand: Brand | null;
  loading: boolean;
  error: string | null;
  limits: PlanLimits;
  isBrandAdmin: boolean;
  isSuperAdmin: boolean;
  refreshBrand: () => Promise<void>;
  /** Super admin puede fijar temporalmente una marca para operar */
  enterBrand: (brandId: string) => Promise<void>;
  exitBrand: () => void;
}

const defaultLimits = getPlanLimits('starter');

const BrandContext = createContext<BrandContextType>({
  brand: null,
  loading: false,
  error: null,
  limits: defaultLimits,
  isBrandAdmin: false,
  isSuperAdmin: false,
  refreshBrand: async () => {},
  enterBrand: async () => {},
  exitBrand: () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  // true hasta el primer resolve: evita redirigir a /platform en el primer paint
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideBrandId, setOverrideBrandId] = useState<string | null>(() => readStoredBrandId());

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const isBrandAdmin = isBrandAdminRole(profile?.role) || isSuperAdmin;

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!profile) {
      setBrand(null);
      setActiveBrandId(null);
      setActiveBrandMeta(null);
      setError(null);
      setLoading(false);
      return;
    }

    const superAdmin = isSuperAdminRole(profile.role);

    // Super admin: solo opera una marca si entró (override / sessionStorage).
    // Usuarios normales: brandId del perfil o Advance legacy.
    const brandId =
      overrideBrandId ||
      profile.brandId ||
      (superAdmin ? null : DEFAULT_BRAND_ID);

    if (!brandId) {
      setBrand(null);
      setActiveBrandId(null);
      setActiveBrandMeta(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const b = await getBrand(brandId);
      if (b) {
        setBrand(b);
        setActiveBrandMeta({
          id: b.id,
          name: b.name,
          whatsapp: b.whatsapp,
          phone: b.phone,
          logoUrl: b.logoUrl,
          email: b.email,
        });
        setError(null);
      } else if (!superAdmin) {
        setBrand(null);
        setActiveBrandMeta({ id: DEFAULT_BRAND_ID, name: 'Advance Coat' });
        setError(null);
      } else {
        setBrand(null);
        setActiveBrandId(null);
        setActiveBrandMeta(null);
        writeStoredBrandId(null);
        setOverrideBrandId(null);
        setError('No se encontró la marca');
      }
      invalidateProductsCache();
    } catch (err) {
      setBrand(null);
      setActiveBrandId(superAdmin ? null : DEFAULT_BRAND_ID);
      setActiveBrandMeta(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading, overrideBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile) {
      setOverrideBrandId(null);
      writeStoredBrandId(null);
    }
  }, [profile?.uid]);

  const enterBrand = useCallback(async (brandId: string) => {
    writeStoredBrandId(brandId);
    setOverrideBrandId(brandId);
  }, []);

  const exitBrand = useCallback(() => {
    writeStoredBrandId(null);
    setOverrideBrandId(null);
    setBrand(null);
    setActiveBrandId(null);
    setActiveBrandMeta(null);
  }, []);

  const limits = useMemo(
    () => getPlanLimits(brand?.planId ?? 'starter'),
    [brand?.planId]
  );

  const value = useMemo(
    () => ({
      brand,
      loading,
      error,
      limits,
      isBrandAdmin,
      isSuperAdmin,
      refreshBrand: load,
      enterBrand,
      exitBrand,
    }),
    [brand, loading, error, limits, isBrandAdmin, isSuperAdmin, load, enterBrand, exitBrand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
