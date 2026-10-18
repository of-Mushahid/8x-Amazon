"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useShop, normalizeItems } from "@/lib/store";
import type { CartItem } from "@/lib/types";

type SessionState = { user: User | null; ready: boolean; configured: boolean; signOut: () => Promise<void> };
const SessionContext = createContext<SessionState>({ user: null, ready: false, configured: false, signOut: async () => {} });
export const useSession = () => useContext(SessionContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [retry, setRetry] = useState(0);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
  useEffect(() => {
    let active = true;
    const client = getBrowserSupabase();
    async function start() {
      await useShop.persist.rehydrate();
      useShop.getState().setHydrated();
      if (client) {
        const { data } = await client.auth.getUser();
        if (active) setUser(data.user);
      }
      if (active) setReady(true);
    }
    void start();
    const subscription = client?.auth.onAuthStateChange((_event, session) => { setUser(session?.user || null); });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    const controller = new AbortController();
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let queue = Promise.resolve();
    const sync = (items: CartItem[]) => {
      queue = queue.then(async () => {
        if (controller.signal.aborted) return;
        const result = await fetch("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }), signal: controller.signal });
        if (!result.ok) throw new Error("Cart sync is paused. Your changes are still saved on this device.");
        setSyncError("");
      }).catch(error => { if (!controller.signal.aborted) setSyncError(error instanceof Error ? error.message : "Cart sync failed."); });
    };
    async function merge() {
      try {
        const response = await fetch("/api/cart", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load your saved cart. Your local cart is safe.");
        const data = await response.json() as { items: CartItem[] };
        const state = useShop.getState();
        const combined = state.owner === user!.id ? state.items : normalizeItems([...data.items, ...(state.owner === null ? state.items : [])]);
        state.setItems(combined);
        state.setOwner(user!.id);
        sync(combined);
        unsubscribe = useShop.subscribe((next, previous) => {
          if (next.items === previous.items) return;
          clearTimeout(timer);
          timer = setTimeout(() => sync(next.items), 300);
        });
      } catch (error) { if (!controller.signal.aborted) setSyncError(error instanceof Error ? error.message : "Cart sync failed."); }
    }
    void merge();
    return () => { controller.abort(); unsubscribe?.(); clearTimeout(timer); };
  }, [user, ready, retry]);

  async function signOut() {
    const client = getBrowserSupabase();
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
    useShop.getState().clear();
    useShop.getState().setOwner(null);
    setUser(null);
    setSyncError("");
  }
  return <SessionContext.Provider value={{ user, ready, configured, signOut }}>
    {syncError && <div className="sync-banner" role="status">{syncError} <button onClick={() => setRetry(value => value + 1)}>Retry sync</button></div>}
    {children}
  </SessionContext.Provider>;
}
