import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const images = path.join(root, "public", "images");
const originals = path.join(images, "contact-sheets");
const products = path.join(images, "products");
const categories = ["tech", "home", "kitchen", "style", "outdoors", "wellness", "workspace", "pets"];
const names = [...categories, "hero"];
const extensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node scripts/generate-assets.mjs <source-directory>");
    console.log(`Supply one 1536x1024 PNG, JPEG, or WebP for each: ${names.join(", ")}.`);
    console.log("Category images must be inspected 4-column x 2-row sheets in catalog order.");
    console.log("This script only crops/converts existing images; it does not generate or verify their content.");
    console.log("With no directory argument, sources are read from public/images/contact-sheets.");
    return;
  }
  if (process.argv.length > 3) throw new Error("Expected at most one source-directory argument.");
  const sourceDirectory = process.argv[2] ? path.resolve(process.argv[2]) : originals;
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const sources = new Map();

  // Validate all nine sources before writing any output; never invent missing imagery.
  for (const name of names) {
    const matches = entries.filter(entry => entry.isFile()
      && extensions.has(path.extname(entry.name).toLowerCase())
      && path.parse(entry.name).name === name);
    if (matches.length !== 1) {
      throw new Error(`Expected exactly one image named ${name} in ${sourceDirectory}; found ${matches.length}.`);
    }
    const source = path.join(sourceDirectory, matches[0].name);
    const metadata = await sharp(source).metadata();
    if (metadata.width !== 1536 || metadata.height !== 1024
      || (metadata.pages ?? 1) !== 1 || (metadata.orientation ?? 1) !== 1) {
      throw new Error(`${source} must be a single, upright 1536x1024 image.`);
    }
    sources.set(name, source);
  }

  await mkdir(originals, { recursive: true });
  await mkdir(products, { recursive: true });
  for (const [name, source] of sources) {
    const retained = path.join(originals, `${name}${path.extname(source).toLowerCase()}`);
    if (path.resolve(source).toLowerCase() !== path.resolve(retained).toLowerCase()) {
      await copyFile(source, retained);
    }
  }

  const outputs = [];
  for (const category of categories) {
    for (let index = 0; index < 8; index += 1) {
      const destination = path.join(products, `${category}-${index + 1}.webp`);
      await sharp(sources.get(category))
        .extract({ left: (index % 4) * 384, top: Math.floor(index / 4) * 512, width: 384, height: 512 })
        .webp({ quality: 92, effort: 6 })
        .toFile(destination);
      outputs.push({ destination, width: 384, height: 512 });
    }
  }
  const hero = path.join(images, "hero.webp");
  await sharp(sources.get("hero")).webp({ quality: 94, effort: 6 }).toFile(hero);
  outputs.push({ destination: hero, width: 1536, height: 1024 });

  for (const output of outputs) {
    const metadata = await sharp(output.destination).metadata();
    if (metadata.format !== "webp" || metadata.width !== output.width || metadata.height !== output.height) {
      throw new Error(`Output verification failed: ${output.destination}`);
    }
  }
  console.log(`Verified ${outputs.length - 1} product WebPs (384x512) and hero.webp (1536x1024).`);
  console.log(`Original sources retained unchanged in ${originals}`);
  console.log("Product identity, color, and sheet alignment still require human or image-tool inspection.");
}

main().catch(error => {
  console.error(`Asset conversion failed: ${error.message}`);
  process.exitCode = 1;
});
