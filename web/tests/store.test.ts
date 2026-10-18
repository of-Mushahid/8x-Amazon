import assert from "node:assert/strict";
import test from "node:test";
import { products, categories, totals } from "../data/catalog";
import { normalizeItems, resolveItems } from "../lib/store";

const product = products[0];
const item = { productId: product.id, variantId: product.variants[0].id, quantity: 1 };

test("catalog has 64 distinct products across eight balanced departments", () => {
  assert.equal(products.length, 64);
  assert.equal(categories.length, 8);
  assert.equal(new Set(products.map(row => row.id)).size, 64);
  assert.equal(new Set(products.map(row => row.slug)).size, 64);
  for (const category of categories) assert.equal(products.filter(row => row.category_id === category.id).length, 8);
});
test("normalization rejects unknown and invalid lines", () => {
  assert.deepEqual(normalizeItems([{ ...item, productId: "invalid" }, { ...item, variantId: products[8].variants[0].id }, { ...item, quantity: NaN }, { ...item, quantity: 0 }, { ...item, quantity: -1 }]), []);
});
test("normalization merges duplicates and caps quantity", () => {
  assert.deepEqual(normalizeItems([item, { ...item, quantity: 50 }]), [{ ...item, quantity: Math.min(10, product.stock_quantity, product.variants[0].stock_quantity) }]);
});
test("normalization is idempotent and respects aggregate stock", () => {
  const rows = normalizeItems(products.flatMap(row => row.variants.map(variant => ({ productId: row.id, variantId: variant.id, quantity: 99 }))));
  assert.deepEqual(normalizeItems(rows), rows);
  for (const row of products) assert.ok(rows.filter(line => line.productId === row.id).reduce((sum, line) => sum + line.quantity, 0) <= row.stock_quantity);
});
test("fractional quantities are floored and product price is authoritative", () => {
  const variant = product.variants[1];
  const rows = resolveItems([{ ...item, variantId: variant.id, quantity: 2.9 }]);
  assert.equal(rows[0].quantity, Math.min(2, variant.stock_quantity));
  assert.equal(rows[0].unitPrice, product.price + variant.price_delta);
});
test("shipping threshold and tax use integer cents", () => {
  assert.deepEqual(totals(0), { subtotal: 0, shipping: 0, tax: 0, total: 0 });
  assert.deepEqual(totals(4999), { subtotal: 4999, shipping: 495, tax: 400, total: 5894 });
  assert.deepEqual(totals(5000), { subtotal: 5000, shipping: 0, tax: 400, total: 5400 });
});
