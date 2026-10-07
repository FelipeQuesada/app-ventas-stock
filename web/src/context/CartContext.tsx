import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Product, SaleItem } from '@advance-coat/shared';
import { lineKey, matchWholesaleOffer, repriceCartLines } from '@advance-coat/shared';

interface CartContextType {
  items: SaleItem[];
  count: number;
  addProduct: (product: Product) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateSubtotal: (key: string, subtotal: number) => void;
  updateUnitPrice: (key: string, unitPrice: number) => void;
  updateLineDiscount: (key: string, percent: number) => void;
  removeItem: (key: string) => void;
  setItems: (items: SaleItem[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SaleItem[]>([]);

  const addProduct = useCallback((product: Product) => {
    // Se permite vender aunque el stock cargado sea 0 (stock físico no cargado).
    setItems((current) => {
      const offer = matchWholesaleOffer(product);
      const existing = current.find(
        (item) => item.productId === product.id && item.wholesaleMode !== 'pack' && !item.isExtra
      );
      if (existing) {
        return repriceCartLines(
          current.map((item) =>
            item === existing
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  listUnitPrice: item.listUnitPrice ?? product.price,
                  wholesaleOfferId: offer?.id ?? item.wholesaleOfferId,
                  wholesaleMode: offer ? 'unit' : item.wholesaleMode,
                }
              : item
          )
        );
      }

      return repriceCartLines([
        ...current,
        {
          lineId: offer ? `unit-${product.id}` : product.id,
          productId: product.id,
          productName: product.name,
          category: product.category,
          quantity: 1,
          listUnitPrice: product.price,
          unitPrice: product.price,
          subtotal: product.price,
          wholesaleOfferId: offer?.id,
          wholesaleMode: offer ? 'unit' : undefined,
        },
      ]);
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) =>
      repriceCartLines(
        current.map((item) => {
          if (lineKey(item) !== key) return item;
          if (item.wholesaleMode === 'pack' && item.unitsPerPack && item.packQuantity != null) {
            const packs = Math.round(quantity);
            return { ...item, quantity: packs * item.unitsPerPack };
          }
          return { ...item, quantity, subtotal: item.unitPrice * quantity };
        })
      )
    );
  }, []);

  const updateSubtotal = useCallback((key: string, newSubtotal: number) => {
    if (!Number.isFinite(newSubtotal) || newSubtotal < 0) return;
    setItems((current) =>
      current.map((item) => {
        if (lineKey(item) !== key || item.wholesaleOfferId) return item;
        const unitPrice = item.quantity > 0 ? newSubtotal / item.quantity : newSubtotal;
        return {
          ...item,
          subtotal: newSubtotal,
          unitPrice,
          listUnitPrice: unitPrice,
          lineDiscountPercent: 0,
        };
      })
    );
  }, []);

  const updateUnitPrice = useCallback((key: string, unitPrice: number) => {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return;
    setItems((current) =>
      current.map((item) => {
        if (lineKey(item) !== key || item.wholesaleOfferId) return item;
        return {
          ...item,
          unitPrice,
          listUnitPrice: unitPrice,
          lineDiscountPercent: 0,
          subtotal: unitPrice * item.quantity,
        };
      })
    );
  }, []);

  const updateLineDiscount = useCallback((key: string, percent: number) => {
    const next = Math.min(100, Math.max(0, percent));
    setItems((current) =>
      repriceCartLines(
        current.map((item) => {
          if (lineKey(item) !== key || item.wholesaleOfferId || item.isExtra) return item;
          return {
            ...item,
            listUnitPrice: item.listUnitPrice ?? item.unitPrice,
            lineDiscountPercent: next,
          };
        })
      )
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => repriceCartLines(current.filter((item) => lineKey(item) !== key)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      addProduct,
      updateQuantity,
      updateSubtotal,
      updateUnitPrice,
      updateLineDiscount,
      removeItem,
      setItems,
      clear,
    }),
    [
      items,
      count,
      addProduct,
      updateQuantity,
      updateSubtotal,
      updateUnitPrice,
      updateLineDiscount,
      removeItem,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
