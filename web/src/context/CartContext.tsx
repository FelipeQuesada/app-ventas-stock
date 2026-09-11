import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Product, SaleItem } from '@advance-coat/shared';

interface CartContextType {
  items: SaleItem[];
  count: number;
  addProduct: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSubtotal: (productId: string, subtotal: number) => void;
  updateUnitPrice: (productId: string, unitPrice: number) => void;
  removeItem: (productId: string) => void;
  setItems: (items: SaleItem[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SaleItem[]>([]);

  const addProduct = useCallback((product: Product) => {
    // Se permite vender aunque el stock cargado sea 0 (stock físico no cargado).
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: item.unitPrice * (item.quantity + 1),
              }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          category: product.category,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              subtotal: item.unitPrice * quantity,
            }
          : item
      )
    );
  }, []);

  const updateSubtotal = useCallback((productId: string, newSubtotal: number) => {
    if (!Number.isFinite(newSubtotal) || newSubtotal < 0) return;
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              subtotal: newSubtotal,
              unitPrice: item.quantity > 0 ? newSubtotal / item.quantity : newSubtotal,
            }
          : item
      )
    );
  }, []);

  const updateUnitPrice = useCallback((productId: string, unitPrice: number) => {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return;
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              unitPrice,
              subtotal: unitPrice * item.quantity,
            }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
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
