import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (product, quantity = 1) => {
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
          price: product.price,
          imageUrl: product.imageUrl,
          availableQty: product.availableQty,
          quantity: Math.min(quantity, product.availableQty),
        },
      ];
    });
  };

  const updateQuantity = (sku, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, quantity: Math.max(1, Math.min(quantity, i.availableQty)) } : i))
    );
  };

  const removeItem = (sku) => {
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
