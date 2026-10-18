import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Run explicitly with Node 22.18+: node --env-file=.env.local scripts/seed.ts
// Apply 001_store.sql first. Rerunning upserts the demo data and resets demo stock.
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Seed configuration required: supply a Supabase URL and server-only service-role key.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  // A URL import works with Node's native TypeScript runner without changing tsconfig.
  const { categories, products }: typeof import("../data/catalog") = await import(new URL("../data/catalog.ts", import.meta.url).href);
  if (categories.length !== 8 || products.length !== 64) throw new Error("Expected the independent demo catalog to contain 8 categories and 64 products.");
  for (const product of products) {
    if (!Number.isSafeInteger(product.price) || product.price < 0 ||
        (product.compare_at_price !== null && !Number.isSafeInteger(product.compare_at_price)) ||
        product.variants.some((variant) => !Number.isSafeInteger(variant.price_delta))) {
      throw new Error("Catalog prices must be integer cents.");
    }
    if (product.reviews.some((review) => !review.author || review.author.includes("@"))) {
      throw new Error("Sample reviews must use explicit display names, never email addresses.");
    }
  }
  const imagesDirectory = fileURLToPath(new URL("../public/images/products/", import.meta.url));
  const files = (await readdir(imagesDirectory, { withFileTypes: true }))
    .filter((file) => file.isFile() && file.name.endsWith(".webp")).map((file) => file.name).sort();
  const expectedPaths = [...categories.map((category) => category.image_url), ...products.flatMap((product) => product.images)];
  for (const localPath of expectedPaths) {
    if (!localPath.startsWith("/images/products/") || !files.includes(path.posix.basename(localPath))) {
      throw new Error("A catalog product image is missing from public/images/products. Generate all product images before seeding.");
    }
  }
  const { data: bucket, error: bucketError } = await client.storage.getBucket("product-images");
  if (bucketError || !bucket?.public) throw new Error("The public product-images Storage bucket is missing. Apply the store migration first.");
  const remoteUrls = new Map<string, string>();
  for (const file of files) {
    const bytes = await readFile(path.join(imagesDirectory, file));
    const { error } = await client.storage.from("product-images").upload(file, bytes, {
      contentType: "image/webp", cacheControl: "3600", upsert: true,
    });
    if (error) throw new Error("Product image upload failed. Check the bucket configuration and service-role access.");
    remoteUrls.set(`/images/products/${file}`, client.storage.from("product-images").getPublicUrl(file).data.publicUrl);
  }
  function remote(localPath: string): string {
    const result = remoteUrls.get(localPath);
    if (!result) throw new Error("A catalog image was not uploaded.");
    return result;
  }
  const categoryRows = categories.map((category) => ({ ...category, image_url: remote(category.image_url) }));
  const productRows = products.map((product) => {
    const { variants, reviews, ...row } = product;
    // Keep nested records out of the products table.
    void variants; void reviews;
    return { ...row, images: row.images.map(remote) };
  });
  const variantRows = products.flatMap((product) => product.variants);
  const reviewRows = products.flatMap((product) => product.reviews.map((review) => ({
    ...review, product_id: product.id, user_id: null, is_sample: true,
    author: `${review.author} (sample reviewer)`,
  })));
  const batches: [string, Record<string, unknown>[]][] = [
    ["categories", categoryRows], ["products", productRows], ["product_variants", variantRows], ["reviews", reviewRows],
  ];
  for (const [table, rows] of batches) {
    const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`Could not upsert ${table}. Check that the store migration is applied and the service-role key has access.`);
  }
  console.log(`Seeded ${categoryRows.length} categories, ${productRows.length} products, ${variantRows.length} variants, ${reviewRows.length} sample reviews, and ${files.length} images. Demo inventory was reset.`);
}

main().catch((error: unknown) => {
  // Only our allowlisted operational messages are printable; SDK exceptions may contain secrets.
  const message = error instanceof Error ? error.message : "";
  const safePrefixes = ["Seed configuration required:", "Expected the independent demo catalog", "Catalog prices must", "Sample reviews must", "A catalog product image is missing", "The public product-images", "Product image upload failed", "A catalog image was not uploaded", "Could not upsert "];
  console.error(safePrefixes.some((prefix) => message.startsWith(prefix)) ? message : "Seeding failed. Check local product images, Supabase configuration, and database connectivity.");
  process.exitCode = 1;
});
