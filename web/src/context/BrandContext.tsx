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
import { setActiveBrandId } from '../lib/brandScope';
import { invalidateProductsCache } from '../services/products';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideBrandId, setOverrideBrandId] = useState<string | null>(null);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const isBrandAdmin = isBrandAdminRole(profile?.role) || isSuperAdmin;

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!profile) {
      setBrand(null);
      setActiveBrandId(null);
      setError(null);
      return;
    }

    // Legacy Advance: usuarios sin brandId operan como Advance hasta que se selle el perfil
    const brandId =
      overrideBrandId ||
      profile.brandId ||
      (isSuperAdminRole(profile.role) ? null : DEFAULT_BRAND_ID);
    if (!brandId) {
      setBrand(null);
      setActiveBrandId(null);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const b = await getBrand(brandId);
      setBrand(b);
      setActiveBrandId(b?.id ?? brandId);
      invalidateProductsCache();
      setError(b ? null : 'No se encontró la marca');
    } catch (err) {
      setBrand(null);
      setActiveBrandId(brandId);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading, overrideBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile) setOverrideBrandId(null);
  }, [profile?.uid]);

  const enterBrand = useCallback(async (brandId: string) => {
    setOverrideBrandId(brandId);
  }, []);

  const exitBrand = useCallback(() => {
    setOverrideBrandId(null);
    if (isSuperAdmin) {
      setBrand(null);
      setActiveBrandId(null);
    }
  }, [isSuperAdmin]);

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
