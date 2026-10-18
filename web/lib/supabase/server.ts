import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { StoreError } from "../checkout";

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        // Route handlers can refresh auth cookies; Server Components cannot write cookies.
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) throw error;
        }
      },
    },
  });
}

export function configurationRequired(): StoreError {
  return new StoreError("Supabase configuration is required. Set the public URL and key, configure the server service-role key, and apply the store migration before using persisted features.", 503, "CONFIGURATION_REQUIRED");
}

export async function requireServerSupabase(): Promise<SupabaseClient> {
  const client = await getServerSupabase();
  if (!client) throw configurationRequired();
  return client;
}

// Always verify with Auth; never authorize from getSession() or unverified cookie claims.
export async function getVerifiedUser(client: SupabaseClient): Promise<User | null> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      throw new StoreError("Your sign-in has expired. Please sign in again.", 401, "AUTH_REQUIRED");
    }
    throw new StoreError("Sign-in verification is temporarily unavailable. Please try again.", 503, "AUTH_UNAVAILABLE");
  }
  return data.user;
}

export async function requireUser(client: SupabaseClient): Promise<User> {
  const user = await getVerifiedUser(client);
  if (!user) throw new StoreError("Please sign in to use this feature.", 401, "AUTH_REQUIRED");
  return user;
}

export function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "Pragma": "no-cache" } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof StoreError) return jsonResponse({ error: error.message, message: error.message, code: error.code }, error.status);
  // Do not send SQL, tokens, receipt secrets, addresses, or internal exception details to clients/logs.
  return jsonResponse({ error: "The store could not complete this request. Please try again.", message: "The store could not complete this request. Please try again.", code: "STORE_UNAVAILABLE" }, 503);
}

export function checkDatabaseError(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const messages: Record<string, [string, number, string]> = {
    STORE_INVALID: ["Some order or cart details are invalid. Please review your entries.", 400, "INVALID_REQUEST"],
    STORE_STOCK: ["There is not enough stock for this order. Please update your cart.", 409, "OUT_OF_STOCK"],
    STORE_CATALOG: ["A product or variant is no longer available. Please update your cart.", 409, "CATALOG_CHANGED"],
    STORE_IDEMPOTENCY: ["This retry key belongs to a different checkout. Use a new key after changing your order.", 409, "IDEMPOTENCY_CONFLICT"],
    STORE_AMOUNT: ["This order exceeds the supported amount. Please reduce your cart.", 400, "AMOUNT_TOO_LARGE"],
  };
  const known = messages[error.message];
  if (known) throw new StoreError(...known);
  if (["PGRST202", "PGRST205", "42P01", "42883", "42501"].includes(error.code ?? "")) throw configurationRequired();
  if (error.code === "23514" || error.code === "22P02") throw new StoreError("Some details are invalid. Please review your entries.");
  throw new StoreError("The database could not complete this request. Please try again.", 503, "DATABASE_UNAVAILABLE");
}

// Explicit projections keep receipt hashes, email, and idempotency metadata out of API responses.
export const ORDER_SELECT = "id,status,total_amount,subtotal,shipping_cost,tax,shipping_address,payment_method,created_at,items:order_items(product_id,variant_id,quantity,price_at_purchase,name,image,variant_name)";
