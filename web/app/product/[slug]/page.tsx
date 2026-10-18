import { notFound } from "next/navigation";
import { findProduct, products } from "@/data/catalog";
import { ProductDetails } from "@/components/shop/product-details";
export function generateStaticParams() { return products.map(product => ({ slug: product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const product = findProduct((await params).slug);
  return { title: product ? `${product.name} | Everyday` : "Product not found | Everyday", description: product?.description };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = findProduct((await params).slug);
  if (!product) notFound();
  return <ProductDetails product={product} />;
}
