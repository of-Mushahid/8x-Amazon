import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Curated DummyJSON demo assets, not AI-generated or licensed stock photography.
// This script only writes data/, public/images/, and the generated catalog therein.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const imageDir = path.join(root, "public", "images");
const productDir = path.join(imageDir, "products");
const sheetDir = path.join(imageDir, "contact-sheets");
const manifestPath = path.join(dataDir, "catalog-assets.json");
const endpoint = "https://dummyjson.com/products?limit=0";
const offline = process.argv.includes("--offline");
const groups = [
  { id: "tech", name: "Tech & electronics", description: "Connected essentials for everyday life.", ids: [101, 103, 100, 107, 105, 104, 123, 99] },
  { id: "home", name: "Home & living", description: "Furniture and finishing touches for your space.", ids: [12, 14, 47, 46, 43, 44, 45, 13] },
  { id: "kitchen", name: "Kitchen & dining", description: "Useful tools for cooking and gathering.", ids: [49, 48, 53, 52, 67, 71, 54, 76] },
  { id: "style", name: "Style essentials", description: "Shirts, dresses, and everyday expression.", ids: [83, 84, 85, 86, 162, 164, 177, 166] },
  { id: "outdoors", name: "Sports & outdoors", description: "Make time for a little more play.", ids: [140, 139, 147, 152, 151, 137, 146, 153] },
  { id: "wellness", name: "Beauty & care", description: "Personal care for your daily routine.", ids: [1, 2, 3, 4, 5, 118, 119, 120] },
  { id: "workspace", name: "The workspace", description: "Laptops and tablets for work and beyond.", ids: [78, 79, 80, 81, 82, 159, 160, 161] },
  { id: "essentials", name: "Everyday essentials", description: "Pantry staples and household basics.", ids: [34, 27, 20, 38, 41, 23, 32, 42] },
];

// Set only after inspecting the generated contact sheets. Mixed means no single
// confident visual color, not an inferred shade or a purchasable color variant.
const visualAudit = Object.fromEntries([
  [101, "Silver", "Silver over-ear headphones match the title."],
  [103, "Mixed", "Dark spherical smart speaker; precise black/grey shade not assigned."],
  [100, "White", "White wireless earbuds and case in all three views."],
  [107, "Mixed", "Neckband-style earphones; yellow-green shade is ambiguous."],
  [105, "White", "White Apple battery pack, including rear charging-ring view."],
  [104, "White", "White charging adapter and cable in both views."],
  [123, "Blue", "Blue triple-camera phone; front and combined views are consistent."],
  [99, "Gray", "Grey cylindrical Echo speaker with blue light ring; both views consistent."],
  [12, "Mixed", "Same sofa in all angles: pale upholstery, wood frame, contrasting cushion."],
  [14, "Red", "Red conference chair upholstery, same chair and metal base in all views."],
  [47, "Mixed", "Decorative table lamp with brown/gold shade and sculpted base."],
  [46, "Mixed", "Green foliage in a dark plant pot; four consistent views."],
  [43, "Mixed", "Dark hanging egg swing with pale cushion; three consistent views."],
  [44, "Mixed", "Tree-shaped family photo-frame display with multiple small frames."],
  [45, "Mixed", "Decorative plant in a raised dark stand; three consistent views."],
  [13, "Brown", "Brown wood bedside table, drawer and open shelf in all views."],
  [49, "Black", "Black handled cup, both angles consistent."],
  [48, "Brown", "Light brown wooden spatula."],
  [53, "Brown", "Brown wood chopping board."],
  [52, "Mixed", "Metal wok with wood handles; material/grade not independently verifiable."],
  [67, "Mixed", "Same metal mug stand; angle two includes red styling mugs."],
  [71, "Silver", "Silver pot with glass lid and dark handles."],
  [54, "Yellow", "Clearly yellow citrus reamer above a metal collector."],
  [76, "Brown", "Wood rolling pin pictured alongside a round board; no bundle claim added."],
  [83, "Mixed", "Blue, white, and dark check shirt; all four views consistent."],
  [84, "Mixed", "White AORUS graphic tee with dark printing; all four views consistent."],
  [85, "Mixed", "Red/black plaid shirt; all four views consistent."],
  [86, "Mixed", "Blue floral short-sleeved shirt; all four views consistent."],
  [162, "Mixed", "Pale dress with blue spots; all four views consistent."],
  [164, "Mixed", "Long sleeveless button-front dress; grey/beige shade ambiguous."],
  [177, "Mixed", "Black-based floral gown, not a plain black garment; all views consistent."],
  [166, "Mixed", "Black/white tartan dress with dark bow; all four views consistent."],
  [140, "Orange", "Orange basketball with dark seams."],
  [139, "Brown", "Brown baseball glove in all three views."],
  [147, "Mixed", "Black/white soccer football."],
  [152, "Red", "Red tennis-racket frame with dark grip."],
  [151, "Yellow", "Bright yellow tennis ball."],
  [137, "Brown", "Brown American football with pale laces and stripes."],
  [146, "White", "White feather-style shuttlecock with dark band."],
  [153, "Mixed", "Blue, white, and dark volleyball panels."],
  [1, "Mixed", "Essence Lash Princess tube and wand; no cosmetic shade inferred."],
  [2, "Mixed", "Multicolor eyeshadow palette with visible mirror; no shade inferred."],
  [3, "Mixed", "Open powder compact; no cosmetic shade inferred from product or case."],
  [4, "Mixed", "Red lipstick visible as titled; no selectable cosmetic shade invented."],
  [5, "Mixed", "Red nail-polish bottles as titled; no selectable cosmetic shade invented."],
  [118, "Mixed", "Attitude Super Leaves pump soap, consistent branded bottle views."],
  [119, "Mixed", "Olay Ultra Moisture pump body wash, consistent branded bottle views."],
  [120, "Mixed", "Vaseline Men pump lotion, consistent branded bottle views."],
  [78, "Gray", "Grey Apple laptop body; three consistent views, not screen-color inference."],
  [79, "Mixed", "Dual-screen Asus laptop; body shade not certain."],
  [80, "Gray", "Dark grey slim laptop body; three consistent views."],
  [81, "Silver", "Silver laptop body with dark keyboard; three consistent views."],
  [82, "Gray", "Dark grey thin-bezel laptop body; three consistent views."],
  [159, "Mixed", "Small Apple tablet; front/back views consistent, starlight shade not inferred."],
  [160, "Gray", "Grey tablet back visible; same tablet and stylus across views."],
  [161, "White", "White tablet bezel and back, consistent across four views."],
  [34, "Mixed", "Nescafe Clasico jar label matches coffee title; source has no brand field."],
  [27, "Mixed", "Clear honey jar with dark lid and printed label."],
  [20, "Mixed", "Bottled pale cooking oil with sunflower label; no type/spec invented."],
  [38, "Mixed", "Rice visible through a paper-bag window; packaging color is not rice color."],
  [41, "Mixed", "Grey patterned tissue box and white tissues in both views."],
  [23, "Brown", "Light brown eggs; image count does not imply a pack-size claim."],
  [32, "White", "White milk in a clear bottle."],
  [42, "Mixed", "Clear water bottle with blue cap; packaging is not water color."],
].map(([id, color, notes]) => [id, { status: "inspected", color, notes }]));
const uuid = (prefix, number) => `${prefix}0000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const localPath = url => path.join(root, "public", url.replace(/^\//, ""));
const xml = text => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

async function fetchChecked(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}

// Explicit allowlist: never persist reviewer emails, barcodes, QR codes, or raw
// provider metadata. Only names supplied by this fictional demo dataset remain.
function sanitize(product) {
  return {
    id: product.id, title: product.title, description: product.description,
    category: product.category, brand: product.brand ?? null,
    price: product.price, stock: product.stock,
    warrantyInformation: product.warrantyInformation,
    shippingInformation: product.shippingInformation,
    images: product.images, thumbnail: product.thumbnail,
    reviews: product.reviews.map(review => ({
      rating: review.rating, comment: review.comment,
      date: review.date, reviewerName: review.reviewerName,
    })),
  };
}

let previous = null;
try { previous = JSON.parse(await readFile(manifestPath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
let sourceProducts;
let sourceTotal;
let retrievedAt;
if (offline) {
  assert(previous, "Run once online before using --offline.");
  sourceProducts = previous.products.map(row => row.original);
  sourceTotal = previous.source.totalProducts;
  retrievedAt = previous.source.retrievedAt;
} else {
  const payload = await (await fetchChecked(endpoint)).json();
  sourceProducts = payload.products;
  sourceTotal = payload.total;
  retrievedAt = new Date().toISOString();
}
const selected = groups.flatMap((group, g) => group.ids.map((sourceId, index) => {
  const raw = sourceProducts.find(product => product.id === sourceId);
  assert(raw, `Missing DummyJSON product ${sourceId}`);
  const original = sanitize(raw);
  assert.equal(original.reviews.length, 3, `Expected three demo reviews: ${raw.title}`);
  const basename = `${group.id}-${index + 1}`;
  return {
    id: uuid("0", g * 8 + index + 1), category: group.id, index: index + 1,
    original,
    assets: [
      ...original.images.map((url, angle) => ({
        role: "original", angle: angle + 1, sourceUrl: url,
        path: `/images/products/${basename}${angle ? `-${angle + 1}` : ""}.webp`,
      })),
      { role: "thumbnail", sourceUrl: original.thumbnail, path: `/images/products/${basename}-thumb.webp` },
    ],
    visualReview: visualAudit[sourceId] ?? { status: "pending", color: "Mixed" },
  };
}));
assert.equal(selected.length, 64);
assert.equal(new Set(selected.map(row => row.original.id)).size, 64);
await mkdir(productDir, { recursive: true });
await mkdir(sheetDir, { recursive: true });

const jobs = selected.flatMap(row => row.assets);
let nextJob = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextJob < jobs.length) {
    const asset = jobs[nextJob++];
    const oldAsset = previous?.products.flatMap(row => row.assets)
      .find(item => item.path === asset.path && item.sourceUrl === asset.sourceUrl);
    let bytes;
    if (oldAsset) {
      try {
        const saved = await readFile(localPath(asset.path));
        if (hash(saved) === oldAsset.sha256) bytes = saved;
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    if (!bytes) {
      assert(!offline, `Missing/changed offline asset: ${asset.path}`);
      const url = new URL(asset.sourceUrl);
      assert.equal(url.hostname, "cdn.dummyjson.com");
      bytes = Buffer.from(await (await fetchChecked(url)).arrayBuffer());
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, "webp", `Unexpected image type: ${url}`);
      await writeFile(localPath(asset.path), bytes);
    }
    const metadata = await sharp(bytes).metadata();
    Object.assign(asset, {
      sha256: hash(bytes), bytes: bytes.length, width: metadata.width,
      height: metadata.height, hasAlpha: metadata.hasAlpha,
    });
  }
}));

function deliveryDays(shipping) {
  const values = shipping.match(/\d+/g)?.map(Number) ?? [];
  if (/overnight/i.test(shipping)) return 1;
  assert(values.length, `Unrecognized shipping estimate: ${shipping}`);
  const multiplier = /month/i.test(shipping) ? 30 : /week/i.test(shipping) ? 7 : 1;
  return Math.max(...values) * multiplier;
}

const categories = groups.map(({ id, name, description }) => ({
  id, slug: id, name, description, image_url: `/images/products/${id}-1.webp`,
}));
const products = selected.map((row, index) => {
  const p = row.original;
  const number = index + 1;
  const stock = Math.min(25, Math.max(0, Math.trunc(p.stock)));
  const reviewRows = p.reviews.map((review, r) => ({
    id: uuid("2", number * 10 + r), rating: review.rating,
    title: "Demo review", body: review.comment,
    author: review.reviewerName, created_at: review.date,
  }));
  const variantNames = row.category === "style" ? ["S", "M", "L"] : ["Standard", "Gift-ready packaging"];
  return {
    id: row.id, name: p.title,
    slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description: p.description, price: Math.round(p.price * 100), compare_at_price: null,
    category_id: row.category, brand: p.brand ?? "Not specified",
    rating: Math.round(reviewRows.reduce((sum, review) => sum + review.rating, 0) / reviewRows.length * 100) / 100,
    review_count: reviewRows.length, stock_quantity: stock,
    images: row.assets.filter(asset => asset.role === "original").map(asset => asset.path),
    features: [p.description, p.warrantyInformation, p.shippingInformation].filter(Boolean),
    is_featured: row.index <= 2, color: row.visualReview.color,
    delivery_days: deliveryDays(p.shippingInformation),
    variants: variantNames.map((variant_name, v) => ({
      id: uuid("1", number * 10 + v), product_id: row.id,
      sku: `ED-${row.category.toUpperCase()}-${row.index}-${v + 1}`,
      variant_name, price_delta: variant_name === "Gift-ready packaging" ? 300 : 0,
      // Allocate one shared capped source stock, rather than multiplying it.
      stock_quantity: Math.floor(stock / variantNames.length) + (v < stock % variantNames.length ? 1 : 0),
    })),
    reviews: reviewRows,
  };
});

function wrap(text, max = 42) {
  const lines = [""];
  for (const word of text.split(" ")) {
    if (lines.at(-1).length + word.length + 1 > max) lines.push(word);
    else lines[lines.length - 1] += `${lines.at(-1) ? " " : ""}${word}`;
  }
  return lines;
}

async function contactSheet(group) {
  const width = 1800, height = 1040, cellWidth = 450, cellHeight = 470;
  const rows = selected.filter(row => row.category === group.id);
  const layers = [];
  let labels = `<rect width="${width}" height="${height}" fill="#eee9dd"/><text x="28" y="40" font-size="27" font-weight="bold">${xml(group.name)} — DummyJSON demo image audit</text><text x="28" y="69" font-size="16">8 products · main original above · all original angles and source thumbnail below · IDs refer to DummyJSON</text>`;
  for (const [index, row] of rows.entries()) {
    const left = index % 4 * cellWidth;
    const top = 94 + Math.floor(index / 4) * cellHeight;
    labels += `<rect x="${left + 8}" y="${top}" width="434" height="452" rx="12" fill="#ffffff"/>`;
    wrap(`${row.index}. ${row.original.title}`).forEach((line, l) => {
      labels += `<text x="${left + 22}" y="${top + 28 + l * 21}" font-size="17" font-weight="bold">${xml(line)}</text>`;
    });
    const main = await sharp(localPath(row.assets[0].path)).resize(386, 238, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    layers.push({ input: main, left: left + 32, top: top + 77 });
    const thumbSize = Math.min(84, Math.floor(414 / row.assets.length));
    for (const [a, asset] of row.assets.entries()) {
      const thumb = await sharp(localPath(asset.path)).resize(thumbSize, 82, { fit: "contain", background: "#f7f6f2" }).png().toBuffer();
      layers.push({ input: thumb, left: left + 20 + a * thumbSize, top: top + 326 });
      labels += `<text x="${left + 22 + a * thumbSize}" y="${top + 425}" font-size="12">${asset.role === "thumbnail" ? "thumb" : `angle ${asset.angle}`}</text>`;
    }
    labels += `<text x="${left + 22}" y="${top + 443}" font-size="12" fill="#666">Source #${row.original.id} · ${xml(row.visualReview.color)} · ${row.assets.length - 1} originals</text>`;
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g font-family="Arial, sans-serif" fill="#242a24">${labels}</g></svg>`);
  const output = `/images/contact-sheets/${group.id}.webp`;
  await sharp(svg).composite(layers).webp({ quality: 92 }).toFile(localPath(output));
  return output;
}
const contactSheets = [];
for (const group of groups) contactSheets.push(await contactSheet(group));

async function cutout(sourceId, width, height) {
  const row = selected.find(item => item.original.id === sourceId);
  const asset = row.assets[0];
  assert(asset.hasAlpha, `Hero requires a transparent original: ${row.original.title}`);
  const { data, info } = await sharp(localPath(asset.path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Suppress low-alpha rectangular source-shadow fringes in the derivative only.
  // The downloadable catalog originals remain byte-for-byte unchanged.
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(Math.max(0, data[i] - 48) * 255 / 207);
  const clean = await sharp(data, { raw: info }).png().toBuffer();
  return sharp(clean).trim({ threshold: 1 }).resize(width, height, { fit: "inside" }).png().toBuffer();
}

// The whole left 46% is kept free of products for the page's heading and CTA.
const heroBackground = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><radialGradient id="wash"><stop stop-color="#faf7ef"/><stop offset="1" stop-color="#eee9dd"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="1536" height="1024" fill="#eee9dd"/><ellipse cx="1220" cy="430" rx="470" ry="590" fill="url(#wash)"/><path d="M910 830V328a215 215 0 0 1 430 0v502" fill="#e6dfcf" opacity=".58"/><ellipse cx="1160" cy="838" rx="330" ry="42" fill="#79705d" opacity=".15" filter="url(#blur)"/></svg>`);
const lamp = await cutout(47, 155, 350);
const lampHeight = (await sharp(lamp).metadata()).height;
const heroLayers = [
  { input: await cutout(12, 650, 430), left: 752, top: 485 },
  { input: await cutout(13, 170, 220), left: 1327, top: 636 },
  { input: lamp, left: 1343, top: 647 - lampHeight },
  { input: await cutout(46, 164, 215), left: 788, top: 752 },
];
await sharp(heroBackground).composite(heroLayers).webp({ quality: 92 }).toFile(path.join(imageDir, "hero.webp"));

const uniqueIds = new Set();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;
for (const product of products) {
  for (const object of [product, ...product.variants, ...product.reviews]) {
    assert(uuidPattern.test(object.id), `Invalid UUID: ${object.id}`);
    assert(!uniqueIds.has(object.id), `Duplicate UUID: ${object.id}`);
    uniqueIds.add(object.id);
  }
  assert(Number.isSafeInteger(product.price));
  assert.equal(product.stock_quantity, product.variants.reduce((sum, v) => sum + v.stock_quantity, 0));
  assert.equal(product.images.length, selected.find(row => row.id === product.id).original.images.length);
}
assert.equal(new Set(products.map(product => product.slug)).size, 64);

const manifest = {
  schemaVersion: 1,
  source: {
    name: "DummyJSON", endpoint, retrievedAt, totalProducts: sourceTotal,
    docs: ["https://dummyjson.com/", "https://dummyjson.com/docs", "https://dummyjson.com/docs/products"],
    purpose: "Public fake/placeholder API for development, testing, and prototyping.",
    imageLicense: "The checked public pages do not specify an image reuse/stock-photo license. Free API access is not evidence of copyright, trademark, endorsement, or commercial image clearance. Demo use only; verify rights before production reuse.",
    privacy: "Only fictional reviewer names, ratings, comments, and dates supplied by the demo dataset are retained. Reviewer emails and other provider metadata are excluded.",
    verificationLimit: "Contact sheets verify visual item/title consistency and source mapping, not manufacturer identity, technical claims, materials, warranties, or image copyright. Some source images look like product renderings rather than camera photographs.",
  },
  visualAudit: {
    inspectedProducts: selected.filter(row => row.visualReview.status === "inspected").length,
    pendingSourceIds: selected.filter(row => row.visualReview.status !== "inspected").map(row => row.original.id),
    method: "Read tool inspection of eight category contact sheets, including every original angle and thumbnail.",
    excludedCandidates: [
      { sourceId: 181, title: "Marni Red & Black Suit", reason: "Image depicts a single dress, not an unmistakable suit; replaced rather than rewriting the source title." },
      { sourceId: 133, title: "Samsung Galaxy S10", reason: "Front and rear phone model details appeared potentially inconsistent; replaced conservatively." },
    ],
  },
  transformations: {
    prices: "Original USD price rounded to integer cents; compare_at_price is null (no invented reference prices).",
    brands: "Original brand verbatim; missing source brands are displayed as Not specified, never inferred from packaging or titles.",
    reviews: "Exactly the three source demo reviews; rating is their arithmetic mean rounded to two decimals, not the provider aggregate rating.",
    stock: "Source stock capped at 25; allocated across demo variants without multiplying stock.",
    variants: "Demo-only S/M/L for clothing; Standard/Gift-ready packaging elsewhere, the latter +300 cents. Sizes/packaging are not claims of source availability.",
    delivery: "Upper bound of source shipping estimate; a week is 7 days and a month is 30 days. Original shipping wording is retained in features.",
    features: "Verbatim description, warranty, and shipping information; no invented technical specifications.",
    photos: "Original source WebP bytes downloaded unchanged, including every original angle and a separate thumbnail. SHA-256 hashes record their identity.",
    color: "Only visually verified single colors are assigned; ambiguous, multicolor, and cosmetic products use Mixed. No color variants are invented.",
    display: "The parent UI must label the catalog, prices, brands, reviews, and checkout as demo data; these are not live retail offers or endorsements.",
  },
  categories,
  counts: {
    products: products.length, originalImages: jobs.filter(asset => asset.role === "original").length,
    thumbnails: jobs.filter(asset => asset.role === "thumbnail").length,
    reviews: products.reduce((sum, product) => sum + product.reviews.length, 0),
    variants: products.reduce((sum, product) => sum + product.variants.length, 0),
  },
  products: selected,
  contactSheets,
  hero: { path: "/images/hero.webp", width: 1536, height: 1024, background: "#eee9dd", sourceIds: [47, 13, 12, 46], description: "Right-heavy editorial collage of original transparent home-product cutouts; no AI-generated content." },
};
const currentPaths = new Set(jobs.map(asset => asset.path));
for (const asset of previous?.products.flatMap(row => row.assets) ?? []) {
  // Remove only known, previously generated originals displaced by this curation.
  if (!currentPaths.has(asset.path) && /^\/images\/products\/[a-z]+-\d+(?:-\d+|-thumb)?\.webp$/.test(asset.path)) {
    try { await unlink(localPath(asset.path)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const catalog = `import type { Category, Product } from "@/lib/types";

// Generated by scripts/catalog-assets.mjs from the public DummyJSON demo API.
// Provenance, source limitations, and visual audit: data/catalog-assets.json.
// This is fictional demo retail data, not verified product claims or live offers.
export const categories: Category[] = ${JSON.stringify(categories, null, 2)};

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export function findProduct(slug: string) { return products.find(product => product.slug === slug); }
export function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
export function totals(subtotal: number) {
  const shipping = subtotal === 0 || subtotal >= 5000 ? 0 : 495;
  const tax = Math.round(subtotal * 0.08);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
`;
await writeFile(path.join(dataDir, "catalog.ts"), catalog);
console.log(JSON.stringify({ ...manifest.counts, categories: categories.map(category => category.id), contactSheets, hero: manifest.hero.path, manifest: manifestPath }, null, 2));
