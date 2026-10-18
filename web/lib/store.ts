"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { products } from "@/data/catalog";
import type { CartItem, Product } from "@/lib/types";

const inventorySchema = z.array(z.object({
  id: z.string(),
  price: z.number().int().nonnegative(),
  compare_at_price: z.number().int().nonnegative().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  variants: z.array(z.object({
    id: z.string(), product_id: z.string(),
    price_delta: z.number().int(), stock_quantity: z.number().int().nonnegative(),
  })),
}));
export type ProductInventory = z.infer<typeof inventorySchema>[number];
type InventoryState = { status: "seed" | "loading" | "live" | "error"; updatedAt: number | null; error: string | null };

export function normalizeItems(items: CartItem[], catalog: readonly Product[] = products): CartItem[] {
  const result: CartItem[] = [];
  for (const item of items) {
    const product = catalog.find(p => p.id === item.productId);
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
// Existing checkout consumers subscribe to items. Inventory updates replace that
// array even for price-only changes, so they resolve against the new catalog.
export function resolveItems(items: CartItem[], catalog: readonly Product[] = useShop.getState().catalog) {
  return normalizeItems(items, catalog).flatMap(item => {
    const product = catalog.find(p => p.id === item.productId)!;
    const variant = product.variants.find(v => v.id === item.variantId)!;
    return [{ ...item, product, variant, unitPrice: product.price + variant.price_delta }];
  });
}
function mergeInventory(catalog: Product[], value: unknown): Product[] {
  const rows = inventorySchema.parse(value);
  const byId = new Map<string, ProductInventory>();
  for (const row of rows) {
    if (byId.has(row.id) || new Set(row.variants.map(variant => variant.id)).size !== row.variants.length || row.variants.some(variant => variant.product_id !== row.id || !Number.isSafeInteger(row.price + variant.price_delta) || row.price + variant.price_delta < 0)) {
      throw new Error("Invalid inventory response.");
    }
    byId.set(row.id, row);
  }
  return catalog.map(product => {
    const live = byId.get(product.id);
    // A complete snapshot may no longer contain a bundled product or variant.
    // Keep its content, but never fall back to seed stock for a missing DB row.
    if (!live) return { ...product, stock_quantity: 0, variants: product.variants.map(variant => ({ ...variant, stock_quantity: 0 })) };
    return {
      ...product, price: live.price, compare_at_price: live.compare_at_price, stock_quantity: live.stock_quantity,
      variants: product.variants.map(variant => {
        const current = live.variants.find(row => row.id === variant.id);
        return current ? { ...variant, price_delta: current.price_delta, stock_quantity: current.stock_quantity } : { ...variant, stock_quantity: 0 };
      }),
    };
  });
}
type ShopState = {
  catalog: Product[]; inventory: InventoryState;
  updateInventory: (inventory: unknown) => void; setInventoryLoading: () => void; setInventoryError: (message: string) => void;
  items: CartItem[]; saved: CartItem[]; owner: string | null; hydrated: boolean; cartOpen: boolean;
  setHydrated: () => void; setOwner: (owner: string | null) => void; setItems: (items: CartItem[]) => void;
  add: (productId: string, variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void; remove: (variantId: string) => void;
  saveForLater: (variantId: string) => void; toggleSaved: (productId: string) => void;
  restore: (productId: string) => void; setCartOpen: (open: boolean) => void; clear: () => void;
};
export const useShop = create<ShopState>()(persist((set, get) => ({
  catalog: products, inventory: { status: "seed", updatedAt: null, error: null },
  items: [], saved: [], owner: null, hydrated: false, cartOpen: false,
  updateInventory: value => set(state => {
    const catalog = mergeInventory(state.catalog, value);
    return { catalog, items: normalizeItems(state.items, catalog), inventory: { status: "live", updatedAt: Date.now(), error: null } };
  }),
  setInventoryLoading: () => set(state => ({ inventory: { ...state.inventory, status: "loading" } })),
  setInventoryError: error => set(state => ({ inventory: { ...state.inventory, status: "error", error } })),
  setHydrated: () => set(state => ({ hydrated: true, items: normalizeItems(state.items, state.catalog) })),
  setOwner: owner => set({ owner }),
  setItems: items => set(state => ({ items: normalizeItems(items, state.catalog) })),
  add: (productId, variantId, quantity = 1) => set(state => ({ items: normalizeItems([...state.items, { productId, variantId, quantity }], state.catalog), cartOpen: true })),
  setQuantity: (variantId, quantity) => set(state => ({ items: normalizeItems(state.items.map(item => item.variantId === variantId ? { ...item, quantity } : item), state.catalog) })),
  remove: variantId => set({ items: get().items.filter(item => item.variantId !== variantId) }),
  saveForLater: variantId => {
    const state = get();
    const item = state.items.find(row => row.variantId === variantId);
    if (item) set({ items: state.items.filter(row => row.variantId !== variantId), saved: normalizeItems([...state.saved.filter(row => row.productId !== item.productId), item], state.catalog) });
  },
  toggleSaved: productId => {
    const state = get();
    const product = state.catalog.find(p => p.id === productId);
    const variant = product?.variants.find(row => row.stock_quantity > 0) ?? product?.variants[0];
    if (!variant) return;
    set({ saved: state.saved.some(row => row.productId === productId) ? state.saved.filter(row => row.productId !== productId) : [...state.saved, { productId, variantId: variant.id, quantity: 1 }] });
  },
  restore: productId => {
    const state = get();
    const item = state.saved.find(row => row.productId === productId);
    const product = state.catalog.find(row => row.id === productId);
    const variant = product?.variants.find(row => row.id === item?.variantId && row.stock_quantity > 0) ?? product?.variants.find(row => row.stock_quantity > 0);
    if (!item || !variant) return;
    const items = normalizeItems([...state.items, { ...item, variantId: variant.id }], state.catalog);
    if (items.reduce((sum, row) => sum + row.quantity, 0) <= state.items.reduce((sum, row) => sum + row.quantity, 0)) return;
    set({ saved: state.saved.filter(row => row.productId !== productId), items, cartOpen: true });
  },
  setCartOpen: cartOpen => set({ cartOpen }), clear: () => set({ items: [] }),
}), { name: "everyday-shopping-v1", skipHydration: true, partialize: ({ items, saved, owner }) => ({ items, saved, owner }) }));
