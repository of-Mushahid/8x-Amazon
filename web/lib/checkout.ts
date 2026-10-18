import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Address, CartItem, CheckoutInput } from "./types";

// Dependency-free validation/security helpers. Prices and totals are integer cents.
export const MAX_CART_LINES = 50;
export const MAX_QUANTITY = 99;
export const MAX_CENTS = 2_147_483_647;
export const GUEST_SESSION_COOKIE = "store_guest_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class StoreError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 400, code = "INVALID_REQUEST") {
    super(message);
    this.name = "StoreError";
    this.status = status;
    this.code = code;
  }
}

export function strictObject(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StoreError(`${label} must be an object.`);
  }
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(object, key))) {
    throw new StoreError(`${label} contains missing or unsupported fields. Do not send payment card details.`);
  }
  return object;
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new StoreError(`${label} must be valid text.`);
  }
  const result = value.trim();
  if (result.length < min || result.length > max) throw new StoreError(`${label} must contain ${min}–${max} characters.`);
  return result;
}

export function parseAddress(value: unknown): Address {
  const address = strictObject(value, ["fullName", "street", "city", "state", "zip", "country"], "Shipping address");
  if (address.country !== "US") throw new StoreError("This demo ships only to the United States.");
  const state = text(address.state, "State", 2, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new StoreError("Enter a two-letter state code.");
  const zip = text(address.zip, "ZIP code", 5, 10);
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new StoreError("Enter a valid US ZIP code.");
  return {
    fullName: text(address.fullName, "Full name", 2, 120),
    street: text(address.street, "Street", 2, 200),
    city: text(address.city, "City", 2, 100),
    state, zip, country: "US",
  };
}

export function parseCartItems(value: unknown, allowEmpty = false): CartItem[] {
  if (!Array.isArray(value) || value.length > MAX_CART_LINES || (!allowEmpty && value.length === 0)) {
    throw new StoreError(`Choose ${allowEmpty ? "0" : "1"}–${MAX_CART_LINES} cart items.`);
  }
  const variants = new Set<string>();
  return value.map((entry) => {
    const item = strictObject(entry, ["productId", "variantId", "quantity"], "Cart item");
    if (typeof item.productId !== "string" || !UUID_PATTERN.test(item.productId) ||
        typeof item.variantId !== "string" || !UUID_PATTERN.test(item.variantId)) {
      throw new StoreError("A cart item has an invalid product or variant ID.");
    }
    if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      throw new StoreError(`Item quantities must be whole numbers from 1 to ${MAX_QUANTITY}.`);
    }
    const variantId = item.variantId.toLowerCase();
    if (variants.has(variantId)) throw new StoreError("Combine duplicate variants into one cart item.");
    variants.add(variantId);
    return { productId: item.productId.toLowerCase(), variantId, quantity: item.quantity };
  });
}

export function parseCheckoutInput(value: unknown): CheckoutInput {
  const input = strictObject(value, ["items", "email", "shipping", "paymentMethod", "idempotencyKey"], "Checkout");
  if (input.paymentMethod !== "demo") throw new StoreError("Only simulated demo payment is accepted. Do not send real card details.");
  const email = text(input.email, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StoreError("Enter a valid receipt email address.");
  const idempotencyKey = text(input.idempotencyKey, "Checkout retry key", 16, 128);
  if (!/^[A-Za-z0-9_:-]+$/.test(idempotencyKey)) throw new StoreError("The checkout retry key contains invalid characters.");
  return { items: parseCartItems(input.items), email, shipping: parseAddress(input.shipping), paymentMethod: "demo", idempotencyKey };
}

function cents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_CENTS) throw new StoreError("The order amount is outside the supported range.");
  return value;
}

// Mirrors the authoritative Postgres calculation; shipping is not taxed.
export function calculateTotals(subtotal: number) {
  cents(subtotal);
  const shipping = subtotal === 0 || subtotal >= 5000 ? 0 : 495;
  const tax = Math.floor((subtotal * 8 + 50) / 100);
  return { subtotal, shipping, tax, total: cents(subtotal + shipping + tax) };
}

export type InventoryProduct = {
  id: string; price: number; stock_quantity: number;
  variants: { id: string; product_id: string; price_delta: number; stock_quantity: number }[];
};

// Useful for deterministic validation tests; checkout itself locks and prices DB rows in the RPC.
export function priceCart(items: CartItem[], catalog: InventoryProduct[]) {
  const parsed = parseCartItems(items);
  const requested = new Map<string, number>();
  let subtotal = 0;
  for (const item of parsed) {
    const product = catalog.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId && candidate.product_id === item.productId);
    if (!product || !variant) throw new StoreError("A product or variant is no longer available.", 409, "CATALOG_CHANGED");
    const quantity = (requested.get(product.id) ?? 0) + item.quantity;
    requested.set(product.id, quantity);
    if (!Number.isSafeInteger(product.stock_quantity) || !Number.isSafeInteger(variant.stock_quantity) ||
        quantity > product.stock_quantity || item.quantity > variant.stock_quantity) {
      throw new StoreError("There is not enough stock for this order.", 409, "OUT_OF_STOCK");
    }
    cents(product.price);
    if (!Number.isSafeInteger(variant.price_delta)) throw new StoreError("A variant price is invalid.");
    subtotal = cents(subtotal + cents(product.price + variant.price_delta) * item.quantity);
  }
  return calculateTotals(subtotal);
}

export function newSecret(): string { return randomBytes(32).toString("hex"); }
export function isSecret(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
export function hashSecret(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }

export function checkoutScope(userId: string | null, guestSecret: string | null): string {
  if (userId && UUID_PATTERN.test(userId)) return hashSecret(`user:${userId.toLowerCase()}`);
  if (userId || !isSecret(guestSecret)) throw new StoreError("A valid checkout session is required.", 401);
  return hashSecret(`guest:${hashSecret(guestSecret)}`);
}

export function checkoutFingerprint(input: CheckoutInput): string {
  const normalized = parseCheckoutInput(input);
  const items = [...normalized.items].sort((a, b) => a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0);
  return hashSecret(JSON.stringify({ items, email: normalized.email, shipping: normalized.shipping, paymentMethod: "demo" }));
}

export function guestReceiptSecret(guestSecret: string, idempotencyKey: string): string {
  if (!isSecret(guestSecret)) throw new StoreError("A valid guest session is required.", 401);
  // A pseudorandom 256-bit per-order secret keyed by a random 256-bit session.
  // Stable on retries (including concurrent replies); only its hash is persisted.
  // Public order IDs, emails, and retry keys alone cannot reconstruct a receipt.
  return createHmac("sha256", Buffer.from(guestSecret, "hex"))
    .update(`store-receipt:v1:${idempotencyKey}`, "utf8").digest("hex");
}

export function verifyReceipt(secret: unknown, expectedHash: unknown): boolean {
  if (!isSecret(secret) || !isSecret(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(hashSecret(secret), "hex"), Buffer.from(expectedHash, "hex"));
}

export function receiptCookie(orderId: string) {
  if (!UUID_PATTERN.test(orderId)) throw new StoreError("Invalid order ID.");
  const id = orderId.toLowerCase();
  return { name: `store_receipt_${id}`, path: `/api/orders/${id}` };
}

export function safeRedirectPath(value: string | null): string {
  if (!value) return "/account";
  try {
    const decoded = decodeURIComponent(value);
    if (!value.startsWith("/") || value.startsWith("//") || !decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "/account";
    const parsed = new URL(value, "https://store.invalid");
    return parsed.origin === "https://store.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/account";
  } catch { return "/account"; }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new StoreError("This request must come from the store website.", 403, "CROSS_SITE_REQUEST");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  assertSameOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new StoreError("Send an application/json request.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65_536) {
        await reader.cancel();
        throw new StoreError("The request is too large.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError("The request body must be valid JSON.");
  } finally { reader.releaseLock(); }
}
