import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { CheckoutInput } from "../lib/types";

// Native Node TypeScript execution, no third-party test runner or live services.
const helpers: typeof import("../lib/checkout") = await import(new URL("../lib/checkout.ts", import.meta.url).href);
const { parseCheckoutInput, parseCartItems, parseAddress, priceCart, calculateTotals, StoreError,
  newSecret, hashSecret, isSecret, checkoutScope, checkoutFingerprint, guestReceiptSecret,
  verifyReceipt, receiptCookie, safeRedirectPath, assertSameOrigin, readJson, MAX_CENTS } = helpers;
const productId = "00000000-0000-4000-8000-000000000001";
const variantId = "10000000-0000-4000-8000-000000000010";
const secondVariantId = "10000000-0000-4000-8000-000000000011";
const userId = "20000000-0000-4000-8000-000000000001";
const input: CheckoutInput = {
  items: [{ productId, variantId, quantity: 1 }],
  email: "shopper@example.test", paymentMethod: "demo", idempotencyKey: "checkout-retry-key-1234",
  shipping: { fullName: "Demo Shopper", street: "123 Main Street", city: "Austin", state: "TX", zip: "78701", country: "US" },
};
const inventory = [{ id: productId, price: 2400, stock_quantity: 4, variants: [
  { id: variantId, product_id: productId, price_delta: 0, stock_quantity: 3 },
  { id: secondVariantId, product_id: productId, price_delta: 300, stock_quantity: 4 },
] }];

function invalid(fn: () => unknown, status = 400) {
  assert.throws(fn, (error: unknown) => error instanceof StoreError && error.status === status);
}

test("checkout normalizes valid input without trusting client totals", () => {
  const result = parseCheckoutInput({ ...input, email: " SHOPPER@example.test ", shipping: { ...input.shipping, state: "tx" } });
  assert.deepEqual(result, input);
  invalid(() => parseCheckoutInput({ ...input, total: 1 }));
  invalid(() => parseCheckoutInput({ ...input, userId }));
  invalid(() => parseCheckoutInput({ ...input, items: [{ ...input.items[0], price: 1 }] }));
});

test("only demo payment is accepted and card fields are rejected", () => {
  for (const paymentMethod of ["card", "stripe", null, "", 0]) invalid(() => parseCheckoutInput({ ...input, paymentMethod }));
  for (const field of ["cardNumber", "cvv", "paymentToken", "card", "total_amount", "status"]) {
    invalid(() => parseCheckoutInput({ ...input, [field]: "not-accepted" }));
  }
  invalid(() => parseCheckoutInput({ ...input, shipping: { ...input.shipping, cardNumber: "not-accepted" } }));
});

test("input shapes, email, and retry keys are bounded", () => {
  for (const value of [null, [], {}, "checkout"]) invalid(() => parseCheckoutInput(value));
  for (const email of ["invalid", "a@b", "a b@example.test", "a\n@example.test", "a".repeat(255)]) invalid(() => parseCheckoutInput({ ...input, email }));
  for (const idempotencyKey of ["short", "a".repeat(129), "invalid retry key", null]) invalid(() => parseCheckoutInput({ ...input, idempotencyKey }));
});

test("address validation requires a bounded US address", () => {
  assert.deepEqual(parseAddress(input.shipping), input.shipping);
  for (const patch of [{ country: "CA" }, { fullName: " " }, { street: "x" }, { city: "\nAustin" }, { state: "Texas" }, { state: "12" }, { zip: "1234" }, { zip: "123456" }]) {
    invalid(() => parseAddress({ ...input.shipping, ...patch }));
  }
  assert.equal(parseAddress({ ...input.shipping, zip: "78701-1234" }).zip, "78701-1234");
});

test("cart rejects empty checkout, duplicate variants, malformed IDs and excess lines", () => {
  invalid(() => parseCartItems([]));
  assert.deepEqual(parseCartItems([], true), []);
  invalid(() => parseCartItems([input.items[0], input.items[0]]));
  invalid(() => parseCartItems([{ ...input.items[0], productId: "invented" }]));
  invalid(() => parseCartItems([{ ...input.items[0], variantId: "' or true --" }]));
  invalid(() => parseCartItems(Array(51).fill(input.items[0])));
});

test("quantities must be bounded integer numbers, never coercible strings", () => {
  for (const quantity of [0, -1, 1.5, 100, "2", NaN, Infinity, null]) {
    invalid(() => parseCartItems([{ ...input.items[0], quantity }]));
  }
  assert.equal(parseCartItems([{ ...input.items[0], quantity: 99 }])[0].quantity, 99);
});

test("tax and free-shipping boundary calculations remain integer cents", () => {
  assert.deepEqual(calculateTotals(0), { subtotal: 0, shipping: 0, tax: 0, total: 0 });
  assert.deepEqual(calculateTotals(4999), { subtotal: 4999, shipping: 495, tax: 400, total: 5894 });
  assert.deepEqual(calculateTotals(5000), { subtotal: 5000, shipping: 0, tax: 400, total: 5400 });
  assert.equal(calculateTotals(6).tax, 0);
  assert.equal(calculateTotals(7).tax, 1);
  assert.equal(calculateTotals(2400).tax, 192); // Shipping is not taxed.
  for (let subtotal = 0; subtotal <= 10_000; subtotal++) {
    const result = calculateTotals(subtotal);
    assert.equal(result.tax, Math.round(subtotal * 0.08));
    assert.ok(Object.values(result).every(Number.isSafeInteger));
  }
});

test("negative, fractional, unsafe and Postgres-overflow amounts are rejected", () => {
  for (const amount of [-1, 1.1, NaN, Infinity, MAX_CENTS, MAX_CENTS + 1, Number.MAX_SAFE_INTEGER]) invalid(() => calculateTotals(amount));
});

test("prices come from inventory, including variant deltas", () => {
  assert.deepEqual(priceCart([{ productId, variantId: secondVariantId, quantity: 2 }], inventory), {
    subtotal: 5400, shipping: 0, tax: 432, total: 5832,
  });
  const updated = [{ ...inventory[0], price: 2600 }];
  assert.equal(priceCart(input.items, updated).subtotal, 2600);
});

test("unknown products, variants and cross-product variants are rejected", () => {
  invalid(() => priceCart(input.items, []), 409);
  invalid(() => priceCart([{ ...input.items[0], variantId: userId }], inventory), 409);
  invalid(() => priceCart(input.items, [{ ...inventory[0], variants: [{ ...inventory[0].variants[0], product_id: userId }] }]), 409);
});

test("inventory checks both per-variant and aggregate product stock", () => {
  invalid(() => priceCart([{ ...input.items[0], quantity: 4 }], inventory), 409);
  invalid(() => priceCart([{ productId, variantId, quantity: 3 }, { productId, variantId: secondVariantId, quantity: 2 }], inventory), 409);
  assert.equal(priceCart([{ productId, variantId, quantity: 2 }, { productId, variantId: secondVariantId, quantity: 2 }], inventory).subtotal, 10200);
});

test("invalid inventory pricing is never coerced into a valid charge", () => {
  invalid(() => priceCart(input.items, [{ ...inventory[0], price: 1.2 }]));
  invalid(() => priceCart(input.items, [{ ...inventory[0], variants: [{ ...inventory[0].variants[0], price_delta: -2500 }] }]));
  invalid(() => priceCart(input.items, [{ ...inventory[0], variants: [{ ...inventory[0].variants[0], price_delta: 0.1 }] }]));
});

test("sessions use 256 random bits and only hashes define guest scopes", () => {
  const first = newSecret();
  const second = newSecret();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(Buffer.from(first, "hex").byteLength, 32);
  assert.notEqual(hashSecret(first), first);
  assert.equal(checkoutScope(null, first), hashSecret(`guest:${hashSecret(first)}`));
  assert.notEqual(checkoutScope(null, first), checkoutScope(null, second));
  assert.notEqual(checkoutScope(userId, first), checkoutScope(null, first));
  assert.equal(checkoutScope(userId, first), checkoutScope(userId, second));
  invalid(() => checkoutScope(null, "forged"), 401);
  invalid(() => checkoutScope("not-a-user", first), 401);
});

test("retry fingerprints are stable across item order and detect meaningful changes", () => {
  const two = { ...input, items: [...input.items, { productId, variantId: secondVariantId, quantity: 1 }] };
  assert.equal(checkoutFingerprint(two), checkoutFingerprint({ ...two, items: [...two.items].reverse() }));
  assert.equal(checkoutFingerprint(input), checkoutFingerprint({ ...input, idempotencyKey: "another-valid-retry-key" }));
  for (const changed of [
    { ...input, email: "other@example.test" },
    { ...input, items: [{ ...input.items[0], quantity: 2 }] },
    { ...input, shipping: { ...input.shipping, street: "456 Main Street" } },
  ]) assert.notEqual(checkoutFingerprint(input), checkoutFingerprint(changed));
});

test("guest receipts are secret, order-specific and stable for idempotent retries", () => {
  const session = newSecret();
  const receipt = guestReceiptSecret(session, input.idempotencyKey);
  assert.ok(isSecret(receipt));
  assert.notEqual(receipt, session);
  assert.equal(receipt, guestReceiptSecret(session, input.idempotencyKey));
  assert.notEqual(receipt, guestReceiptSecret(session, "another-valid-retry-key"));
  assert.notEqual(receipt, guestReceiptSecret(newSecret(), input.idempotencyKey));
  assert.ok(verifyReceipt(receipt, hashSecret(receipt)));
  assert.equal(verifyReceipt(newSecret(), hashSecret(receipt)), false);
  assert.equal(verifyReceipt(receipt, receipt), false);
  for (const malformed of [null, "", "f".repeat(63), "z".repeat(64), {}]) assert.equal(verifyReceipt(malformed, hashSecret(receipt)), false);
  assert.equal(verifyReceipt(receipt, "malformed"), false);
});

test("receipt cookies are scoped to exactly one order endpoint", () => {
  const cookie = receiptCookie(productId);
  assert.equal(cookie.path, `/api/orders/${productId}`);
  assert.ok(cookie.name.includes(productId));
  assert.notEqual(cookie.name, receiptCookie(userId).name);
  invalid(() => receiptCookie("../orders"));
});

test("auth callback destinations cannot redirect off-site", () => {
  assert.equal(safeRedirectPath("/orders?source=checkout"), "/orders?source=checkout");
  for (const path of [null, "https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/\nevil.test", "/%0devil.test", "/%ZZ"]) {
    assert.equal(safeRedirectPath(path), "/account");
  }
});

test("cookie-authenticated writes reject cross-origin browser requests", () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://shop.test/api/cart", { headers: { origin: "https://shop.test" } })));
  invalid(() => assertSameOrigin(new Request("https://shop.test/api/cart", { headers: { origin: "https://evil.test" } })), 403);
  invalid(() => assertSameOrigin(new Request("https://shop.test/api/cart", { headers: { "sec-fetch-site": "cross-site" } })), 403);
});

test("JSON reader accepts bounded JSON and rejects invalid, non-JSON, and oversized bodies", async () => {
  const request = (body: string, contentType = "application/json") => new Request("https://shop.test/api/checkout", {
    method: "POST", headers: { "content-type": contentType, origin: "https://shop.test" }, body,
  });
  assert.deepEqual(await readJson(request(JSON.stringify(input))), input);
  await assert.rejects(readJson(request("broken")), StoreError);
  await assert.rejects(readJson(request("{}", "text/plain")), (error: unknown) => error instanceof StoreError && error.status === 415);
  await assert.rejects(readJson(request("x".repeat(65_537))), (error: unknown) => error instanceof StoreError && error.status === 413);
});

test("migration source declares all required RLS tables and service-only atomic RPCs (not a database execution test)", async () => {
  const sql = await readFile(new URL("../supabase/migrations/001_store.sql", import.meta.url), "utf8");
  for (const table of ["categories", "products", "product_variants", "users", "addresses", "carts", "cart_items", "orders", "order_items", "reviews"]) {
    assert.ok(sql.includes(`alter table public.${table} enable row level security;`));
  }
  assert.match(sql, /security definer set search_path = pg_catalog/g);
  assert.match(sql, /revoke all on function public\.checkout_store[\s\S]*?from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.checkout_store[\s\S]*?to service_role;/);
  assert.match(sql, /revoke all on function public\.replace_store_cart[\s\S]*?from public, anon, authenticated;/);
  assert.match(sql, /unique \(scope_hash, idempotency_key_hash\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /order by p\.id for update/);
  assert.match(sql, /order by v\.id for update/);
  assert.ok(sql.indexOf("return v_existing.id") < sql.indexOf("update public.product_variants v set stock_quantity"));
  assert.doesNotMatch(sql, /create policy[^;]*on public\.(?:orders|order_items)[^;]*to anon/i);
});
