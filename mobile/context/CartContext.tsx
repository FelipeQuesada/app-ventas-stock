import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Product, SaleItem } from '@/types';
import { showAlert } from '@/utils/alert';

interface CartContextType {
  items: SaleItem[];
  count: number;
  addProduct: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number, availableStock?: number) => void;
  updateSubtotal: (productId: string, subtotal: number) => void;
  removeItem: (productId: string) => void;
  setItems: (items: SaleItem[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SaleItem[]>([]);

  const addProduct = useCallback((product: Product) => {
    if (product.stock <= 0) {
      showAlert('Sin stock', `${product.name} no tiene stock disponible`);
      return;
    }

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showAlert('Stock insuficiente', `Solo hay ${product.stock} unidades de ${product.name}`);
          return current;
        }
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

  const updateQuantity = useCallback(
    (productId: string, quantity: number, availableStock?: number) => {
      if (quantity < 1) return;
      if (availableStock != null && quantity > availableStock) {
        showAlert('Stock insuficiente', `Solo hay ${availableStock} unidades disponibles`);
        return;
      }
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
    },
    []
  );

  const updateSubtotal = useCallback((productId: string, newSubtotal: number) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              subtotal: newSubtotal,
              unitPrice: newSubtotal / item.quantity,
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
      removeItem,
      setItems,
      clear,
    }),
    [items, count, addProduct, updateQuantity, updateSubtotal, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
