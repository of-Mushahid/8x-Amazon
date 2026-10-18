"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { products } from "@/data/catalog";
import type { CartItem } from "@/lib/types";

export function normalizeItems(items: CartItem[]): CartItem[] {
  const result: CartItem[] = [];
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.id === item.variantId);
    if (!product || !variant || !Number.isFinite(item.quantity) || item.quantity <= 0) continue;
    const existing = result.find(row => row.variantId === item.variantId);
    const used = result.filter(row => row.productId === item.productId).reduce((sum, row) => sum + row.quantity, 0);
    const amount = Math.max(0, Math.min(Math.floor(item.quantity), product.stock_quantity - used, variant.stock_quantity - (existing?.quantity || 0), 10 - (existing?.quantity || 0)));
    if (existing) existing.quantity += amount;
    else if (amount) result.push({ ...item, quantity: amount });
  }
  return result;
}
export function resolveItems(items: CartItem[]) {
  return normalizeItems(items).flatMap(item => {
    const product = products.find(p => p.id === item.productId)!;
    const variant = product.variants.find(v => v.id === item.variantId)!;
    return [{ ...item, product, variant, unitPrice: product.price + variant.price_delta }];
  });
}
type ShopState = {
  items: CartItem[]; saved: CartItem[]; owner: string | null; hydrated: boolean; cartOpen: boolean;
  setHydrated: () => void; setOwner: (owner: string | null) => void; setItems: (items: CartItem[]) => void;
  add: (productId: string, variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void; remove: (variantId: string) => void;
  saveForLater: (variantId: string) => void; toggleSaved: (productId: string) => void;
  restore: (productId: string) => void; setCartOpen: (open: boolean) => void; clear: () => void;
};
export const useShop = create<ShopState>()(persist((set, get) => ({
  items: [], saved: [], owner: null, hydrated: false, cartOpen: false,
  setHydrated: () => set({ hydrated: true }), setOwner: owner => set({ owner }),
  setItems: items => set({ items: normalizeItems(items) }),
  add: (productId, variantId, quantity = 1) => set({ items: normalizeItems([...get().items, { productId, variantId, quantity }]), cartOpen: true }),
  setQuantity: (variantId, quantity) => set({ items: normalizeItems(get().items.map(item => item.variantId === variantId ? { ...item, quantity } : item)) }),
  remove: variantId => set({ items: get().items.filter(item => item.variantId !== variantId) }),
  saveForLater: variantId => {
    const item = get().items.find(row => row.variantId === variantId);
    if (item) set({ items: get().items.filter(row => row.variantId !== variantId), saved: normalizeItems([...get().saved.filter(row => row.productId !== item.productId), item]) });
  },
  toggleSaved: productId => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    set({ saved: get().saved.some(row => row.productId === productId) ? get().saved.filter(row => row.productId !== productId) : [...get().saved, { productId, variantId: product.variants[0].id, quantity: 1 }] });
  },
  restore: productId => {
    const item = get().saved.find(row => row.productId === productId);
    if (item) set({ saved: get().saved.filter(row => row.productId !== productId), items: normalizeItems([...get().items, item]), cartOpen: true });
  },
  setCartOpen: cartOpen => set({ cartOpen }), clear: () => set({ items: [] }),
}), { name: "everyday-shopping-v1", skipHydration: true, partialize: ({ items, saved, owner }) => ({ items, saved, owner }) }));
