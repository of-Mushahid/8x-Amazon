import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { z } from "zod";
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
  assert.equal(safeRedirectPath("/cart/../orders?source=checkout#receipt"), "/orders?source=checkout#receipt");
  for (const path of [
    null, "https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/\nevil.test", "/%0devil.test", "/%ZZ",
    "/a/..//evil.test", "/a/%2e%2e//evil.test", "/a/.%2E//evil.test", "/a/%2E.//evil.test",
    "/a/..///evil.test?next=/orders#receipt", "/a/../%2fevil.test", "/a/..\\\\evil.test", "/a/%2e%2e/%5cevil.test",
  ]) {
    const result = safeRedirectPath(path);
    assert.equal(result, "/account", String(path));
    // Reproduce the callback's second URL resolution, not just the first parse.
    assert.equal(new URL(result, "https://shop.test/auth/callback").origin, "https://shop.test");
    assert.equal(result.startsWith("//"), false);
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

// Execute the actual handlers in memory with explicit dependency doubles. No Next
// server, environment credentials, Auth calls, database, or generated files.
async function isolatedModule<T>(path: string, dependencies: Record<string, unknown>): Promise<T> {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function("require", "exports", "process", outputText)((name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, exports, { env: { NODE_ENV: "production" } });
  return exports as T;
}

const server = await isolatedModule<typeof import("../lib/supabase/server")>("../lib/supabase/server.ts", {
  "server-only": {}, "@supabase/ssr": {}, "next/headers": {}, "../checkout": helpers,
});

async function routeHarness(options: { publicConfig?: boolean; adminConfig?: boolean; user?: { id: string }; authError?: { name: string; status: number }; found?: boolean } = {}) {
  const jar = new Map<string, string>();
  const writes: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const rpcCalls: Record<string, unknown>[] = [];
  const events: string[] = [];
  const reads: { kind: string; filters: [string, unknown][] }[] = [];
  const order = { id: productId, status: "pending", items: [] };
  const from = (kind: string, table: string) => {
    assert.equal(table, "orders");
    const filters: [string, unknown][] = [];
    const query = {
      select(projection: string) {
        assert.equal(projection, server.ORDER_SELECT);
        assert.doesNotMatch(projection, /hash|email|\*/);
        return query;
      },
      eq(key: string, value: unknown) { filters.push([key, value]); return query; },
      is(key: string, value: unknown) { filters.push([key, value]); return query; },
      async maybeSingle() { reads.push({ kind, filters }); return { data: options.found ? order : null, error: null }; },
    };
    return query;
  };
  const client = {
    auth: { async getUser() { events.push("auth"); return { data: { user: options.user ?? null }, error: options.authError ?? null }; } },
    from: (table: string) => from("owner", table),
  };
  const admin = {
    async rpc(name: string, args: Record<string, unknown>) {
      assert.equal(name, "checkout_store"); rpcCalls.push(args); return { data: productId, error: null };
    },
    from: (table: string) => from("receipt", table),
  };
  const dependencies = {
    "@/lib/checkout": helpers,
    "next/headers": { cookies: async () => ({
      get: (name: string) => jar.has(name) ? { value: jar.get(name) } : undefined,
      set: (name: string, value: string, cookieOptions: Record<string, unknown>) => { writes.push({ name, value, options: cookieOptions }); jar.set(name, value); },
    }) },
    "@/lib/supabase/admin": { getAdminSupabase: () => options.adminConfig === false ? null : admin },
    "@/lib/supabase/server": { ...server, requireServerSupabase: async () => {
      events.push("client");
      if (options.publicConfig === false) throw server.configurationRequired();
      return client;
    } },
  };
  return {
    jar, writes, rpcCalls, events, reads, order,
    checkout: await isolatedModule<typeof import("../app/api/checkout/route")>("../app/api/checkout/route.ts", dependencies),
    receipt: await isolatedModule<typeof import("../app/api/orders/[id]/route")>("../app/api/orders/[id]/route.ts", dependencies),
  };
}

const checkoutRequest = (method = "GET", headers: Record<string, string> = {}) => new Request("https://shop.test/api/checkout", {
  method, headers: { origin: "https://shop.test", "content-type": "application/json", ...headers },
  ...(method === "POST" ? { body: JSON.stringify(input) } : {}),
});
const receiptRequest = () => new Request(`https://shop.test/api/orders/${productId}`);
const receiptContext = { params: Promise.resolve({ id: productId }) };

test("bootstrap creates or preserves an opaque cookie without Auth or order creation", async () => {
  for (const existing of [undefined, "invalid", newSecret()]) {
    const h = await routeHarness();
    if (existing) h.jar.set(helpers.GUEST_SESSION_COOKIE, existing);
    const response = await h.checkout.GET(checkoutRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ready: true });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const [cookie] = h.writes;
    assert.equal(cookie.name, helpers.GUEST_SESSION_COOKIE);
    assert.ok(isSecret(cookie.value));
    if (isSecret(existing)) assert.equal(cookie.value, existing);
    assert.deepEqual(cookie.options, { httpOnly: true, sameSite: "lax", secure: true, path: "/api/checkout", maxAge: helpers.COOKIE_MAX_AGE });
    await h.checkout.GET(checkoutRequest());
    assert.equal(h.writes[1].value, cookie.value);
    assert.deepEqual(h.rpcCalls, []);
    assert.ok(!h.events.includes("auth"));
  }
});

test("bootstrap rejects cross-origin requests and missing configuration without cookies or RPCs", async () => {
  for (const headers of [{ origin: "https://evil.test" } as Record<string, string>, { "sec-fetch-site": "cross-site" } as Record<string, string>]) {
    const h = await routeHarness();
    assert.equal((await h.checkout.GET(checkoutRequest("GET", headers))).status, 403);
    assert.deepEqual(h.events, []);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.rpcCalls, []);
  }
  for (const options of [{ publicConfig: false }, { adminConfig: false }]) {
    const h = await routeHarness(options);
    assert.equal((await h.checkout.GET(checkoutRequest())).status, 503);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.rpcCalls, []);
  }
});

test("guest POST never mints a session and rejects missing or invalid cookies before RPC", async () => {
  for (const secret of [undefined, "", "f".repeat(63), "z".repeat(64)]) {
    const h = await routeHarness();
    if (secret !== undefined) h.jar.set(helpers.GUEST_SESSION_COOKIE, secret);
    for (let retry = 0; retry < 2; retry++) {
      const response = await h.checkout.POST(checkoutRequest("POST"));
      assert.equal(response.status, 409);
      assert.equal((await response.json()).code, "CHECKOUT_SESSION_REQUIRED");
    }
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.rpcCalls, []);
  }
});

test("bootstrapped guest retries keep identical RPC scope, fingerprint and receipt after a lost reply", async () => {
  const h = await routeHarness();
  await h.checkout.GET(checkoutRequest());
  const session = h.jar.get(helpers.GUEST_SESSION_COOKIE)!;
  const first = await h.checkout.POST(checkoutRequest("POST")); // Treat reply as lost.
  await h.checkout.GET(checkoutRequest());
  const second = await h.checkout.POST(checkoutRequest("POST"));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(h.rpcCalls[0], h.rpcCalls[1]);
  assert.equal(h.rpcCalls[0].p_scope_hash, checkoutScope(null, session));
  assert.equal(h.rpcCalls[0].p_request_hash, checkoutFingerprint(input));
  assert.equal(h.rpcCalls[0].p_guest_session_hash, hashSecret(session));
  const receipts = h.writes.filter(cookie => cookie.name === receiptCookie(productId).name);
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].value, receipts[1].value);
  assert.equal(h.writes.filter(cookie => cookie.name === helpers.GUEST_SESSION_COOKIE).length, 2); // GETs only.
  assert.deepEqual(await second.json(), { orderId: productId });
});

test("verified account checkout still works without a guest cookie", async () => {
  const h = await routeHarness({ user: { id: userId } });
  assert.equal((await h.checkout.POST(checkoutRequest("POST"))).status, 200);
  assert.equal(h.rpcCalls[0].p_scope_hash, checkoutScope(userId, null));
  assert.equal(h.rpcCalls[0].p_guest_session_hash, null);
  assert.deepEqual(h.writes, []);
});

test("valid guest receipt bypasses stale or unavailable Auth, retaining narrow hash lookup", async () => {
  for (const status of [401, 503]) {
    const h = await routeHarness({ found: true, authError: { name: "AuthApiError", status } });
    const secret = newSecret();
    h.jar.set(receiptCookie(productId).name, secret);
    const response = await h.receipt.GET(receiptRequest(), receiptContext);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { order: h.order });
    assert.deepEqual(h.events, []);
    assert.deepEqual(h.reads, [{ kind: "receipt", filters: [["id", productId], ["user_id", null], ["guest_receipt_hash", hashSecret(secret)]] }]);
  }
});

test("missing, malformed or unmatched receipts do not bypass owner Auth", async () => {
  for (const secret of [undefined, "invalid", newSecret()]) {
    const h = await routeHarness({ authError: { name: "AuthApiError", status: 401 } });
    if (secret) h.jar.set(receiptCookie(productId).name, secret);
    assert.equal((await h.receipt.GET(receiptRequest(), receiptContext)).status, 401);
    assert.deepEqual(h.events, ["client", "auth"]);
    assert.equal(h.reads.length, isSecret(secret) ? 1 : 0);
  }
  const owner = await routeHarness({ user: { id: userId }, found: true });
  assert.equal((await owner.receipt.GET(receiptRequest(), receiptContext)).status, 200);
  assert.deepEqual(owner.reads, [{ kind: "owner", filters: [["id", productId], ["user_id", userId]] }]);
  const guest = await routeHarness();
  assert.equal((await guest.receipt.GET(receiptRequest(), receiptContext)).status, 404);
});

type CheckoutLock = { request: (name: string, submit: () => Promise<{ orderId: string }>) => Promise<{ orderId: string }> };

async function browserHarness(fetcher: typeof fetch, locks?: CheckoutLock) {
  // Extract actual pure/browser helpers and their schemas, not a duplicated test
  // implementation. This avoids mounting React or loading Next's client runtime.
  const source = await readFile(new URL("../components/shop/account-flows.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("account-flows.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(["addressSchema", "emailSchema", "checkoutSchema", "uuidPattern", "requestJson", "checkoutAttempt", "submitCheckout"]);
  const statements = ast.statements.filter(statement => {
    if (ts.isFunctionDeclaration(statement)) return Boolean(statement.name && names.has(statement.name.text));
    return ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => names.has(declaration.name.getText(ast)));
  });
  assert.equal(statements.length, names.size);
  const { outputText } = ts.transpileModule(statements.map(statement => statement.getText(ast)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  const storage = new Map<string, string>();
  return new Function("z", "fetch", "navigator", "sessionStorage", "crypto", "TextEncoder", `${outputText}\nreturn { checkoutAttempt, submitCheckout };`)(
    z, fetcher, { locks }, { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, crypto, TextEncoder,
  ) as {
    checkoutAttempt: (input: Omit<CheckoutInput, "idempotencyKey">) => Promise<{ storageKey: string; key: string }>;
    submitCheckout: (input: CheckoutInput) => Promise<{ orderId: string }>;
  };
}

test("browser retry keys match the normalized server fingerprint and change with cart, email or shipping", async () => {
  const h = await browserHarness(async () => { throw new Error("No network expected"); });
  const initial = await h.checkoutAttempt(input);
  assert.equal(initial.storageKey, `everyday.checkout.v2:${checkoutFingerprint(input)}`);
  const normalized = { ...input, email: " SHOPPER@EXAMPLE.TEST ", shipping: { ...input.shipping, fullName: " Demo Shopper ", street: " 123 Main Street ", city: " Austin ", state: "tx", zip: " 78701 " } };
  assert.deepEqual(await h.checkoutAttempt(normalized), initial);
  const two = { ...input, items: [...input.items, { productId, variantId: secondVariantId, quantity: 1 }] };
  assert.deepEqual(await h.checkoutAttempt(two), await h.checkoutAttempt({ ...two, items: [...two.items].reverse() }));
  for (const changed of [
    { ...input, email: "other@example.test" },
    { ...input, items: [{ ...input.items[0], quantity: 2 }] },
    ...[{ fullName: "Other Shopper" }, { street: "456 Main Street" }, { city: "Dallas" }, { state: "CA" }, { zip: "90210" }].map(shipping => ({ ...input, shipping: { ...input.shipping, ...shipping } })),
  ]) {
    const attempt = await h.checkoutAttempt(changed);
    assert.notEqual(attempt.key, initial.key);
    assert.equal(attempt.storageKey, `everyday.checkout.v2:${checkoutFingerprint(changed)}`);
    assert.deepEqual(await h.checkoutAttempt(changed), attempt);
  }
  assert.deepEqual(await h.checkoutAttempt(input), initial); // Editing back preserves the original retry.
});

test("browser never POSTs after failed or unready bootstrap and retains the retry key", async () => {
  for (const response of [Response.json({ error: "Unavailable" }, { status: 503 }), Response.json({ ready: false }), new Response("unreadable")]) {
    const methods: string[] = [];
    const h = await browserHarness(async (_url, options) => { methods.push(options!.method!); return response; });
    const attempt = await h.checkoutAttempt(input);
    await assert.rejects(h.submitCheckout({ ...input, idempotencyKey: attempt.key }));
    assert.deepEqual(methods, ["GET"]);
    assert.deepEqual(await h.checkoutAttempt(input), attempt);
  }
});

test("browser serializes bootstrap plus POST across cooperating tabs, with a no-lock fallback", async () => {
  for (const useLocks of [true, false]) {
    const events: string[] = [];
    let queue = Promise.resolve();
    const locks: CheckoutLock = { request(name, submit) {
      assert.equal(name, "everyday.checkout");
      const result = queue.then(async () => {
        events.push("lock");
        try { return await submit(); } finally { events.push("unlock"); }
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    } };
    const h = await browserHarness(async (url, options) => {
      assert.equal(url, "/api/checkout");
      assert.equal(options!.credentials, "same-origin");
      assert.equal(options!.cache, "no-store");
      events.push(options!.method!);
      if (options!.method === "GET") return Response.json({ ready: true });
      assert.deepEqual(JSON.parse(options!.body as string), input);
      return Response.json({ orderId: productId });
    }, useLocks ? locks : undefined);
    if (useLocks) {
      await Promise.all([h.submitCheckout(input), h.submitCheckout(input)]);
      assert.deepEqual(events, ["lock", "GET", "POST", "unlock", "lock", "GET", "POST", "unlock"]);
    } else {
      assert.deepEqual(await h.submitCheckout(input), { orderId: productId });
      assert.deepEqual(events, ["GET", "POST"]);
    }
  }
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
