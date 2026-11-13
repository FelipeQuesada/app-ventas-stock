import { useEffect, useState } from 'react';
import { getSellerNamesForBrand, isAdvanceBrand, SALE_SELLERS } from '@advance-coat/shared';
import { useBrand } from '../context/BrandContext';
import { listUsers } from '../services/auth';

/** Vendedores: Advance = lista fija; otras marcas = usuarios activos. */
export function useBrandSellers(): { sellers: string[]; loading: boolean } {
  const { brand } = useBrand();
  const [sellers, setSellers] = useState<string[]>(
    isAdvanceBrand(brand?.id) ? [...SALE_SELLERS] : []
  );
  const [loading, setLoading] = useState(!isAdvanceBrand(brand?.id));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isAdvanceBrand(brand?.id)) {
        if (!cancelled) {
          setSellers([...SALE_SELLERS]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const users = await listUsers(brand?.id);
        if (!cancelled) {
          setSellers(getSellerNamesForBrand({ brandId: brand?.id, users }));
        }
      } catch {
        if (!cancelled) setSellers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [brand?.id]);

  return { sellers, loading };
}
