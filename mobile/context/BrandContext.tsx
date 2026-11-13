import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Brand } from '@advance-coat/shared';
import { DEFAULT_BRAND_ID, getPlanLimits, type PlanLimits } from '@advance-coat/shared';
import { isBrandAdminRole, isSuperAdminRole } from '@/types';
import { useAuth } from './AuthContext';
import { getBrand } from '@/services/brands';
import { setActiveBrandId } from '@/lib/brandScope';
import { invalidateProductsCache } from '@/services/products';

interface BrandContextType {
  brand: Brand | null;
  loading: boolean;
  limits: PlanLimits;
  isBrandAdmin: boolean;
  isSuperAdmin: boolean;
  refreshBrand: () => Promise<void>;
}

const defaultLimits = getPlanLimits('starter');

const BrandContext = createContext<BrandContextType>({
  brand: null,
  loading: false,
  limits: defaultLimits,
  isBrandAdmin: false,
  isSuperAdmin: false,
  refreshBrand: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const isBrandAdmin = isBrandAdminRole(profile?.role) || isSuperAdmin;

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!profile) {
      setBrand(null);
      setActiveBrandId(null);
      return;
    }

    const brandId =
      profile.brandId ||
      (isSuperAdminRole(profile.role) ? null : DEFAULT_BRAND_ID);
    if (!brandId) {
      setBrand(null);
      setActiveBrandId(null);
      return;
    }

    setLoading(true);
    try {
      const b = await getBrand(brandId);
      if (b) {
        setBrand(b);
        setActiveBrandId(b.id);
      } else if (!isSuperAdminRole(profile.role)) {
        setBrand(null);
        setActiveBrandId(DEFAULT_BRAND_ID);
      } else {
        setBrand(null);
        setActiveBrandId(brandId);
      }
      invalidateProductsCache();
    } catch {
      setActiveBrandId(isSuperAdminRole(profile.role) ? brandId : DEFAULT_BRAND_ID);
      setBrand(null);
    } finally {
      setLoading(false);
    }
  }, [profile, authLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({
      brand,
      loading,
      limits: getPlanLimits(brand?.planId ?? 'starter'),
      isBrandAdmin,
      isSuperAdmin,
      refreshBrand: load,
    }),
    [brand, loading, isBrandAdmin, isSuperAdmin, load]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
