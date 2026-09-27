import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, CartProduct } from '../types';

interface CartContextValue {
  items: CartItem[];
  addItem: (product: CartProduct, quantity?: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: CartProduct, quantity = 1) => {
    if (quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === product.sku);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.availableQty);
        return prev.map((i) => (i.sku === product.sku ? { ...i, quantity: nextQty } : i));
      }
      return [
        ...prev,
        {
          sku: product.sku,
          title: product.title,
          variantTitle: product.variantTitle || null,
          price: product.price,
          imageUrl: product.imageUrl,
          availableQty: product.availableQty,
          quantity: Math.min(quantity, product.availableQty),
        },
      ];
    });
  };

  const updateQuantity = (sku: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, quantity: Math.max(1, Math.min(quantity, i.availableQty)) } : i))
    );
  };

  const removeItem = (sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  };

  const clearCart = () => setItems([]);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0),
    [items]
  );

  const value = { items, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
