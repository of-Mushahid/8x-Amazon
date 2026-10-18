"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, Plus, Star, Truck } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/data/catalog";
import { useShop } from "@/lib/store";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return <span className="rating" aria-label={`${rating.toFixed(1)} out of 5 stars${count === undefined ? "" : `, ${count} sample reviews`}`}><Star size={13} fill="currentColor" /><strong>{rating.toFixed(1)}</strong>{count !== undefined && <span>({count})</span>}</span>;
}
export function ProductCard({ product: bundledProduct, index = 0 }: { product: Product; index?: number }) {
  const product = useShop(state => state.catalog.find(item => item.id === bundledProduct.id) ?? bundledProduct);
  const add = useShop(state => state.add);
  const toggleSaved = useShop(state => state.toggleSaved);
  const isSaved = useShop(state => state.hydrated && state.saved.some(item => item.productId === product.id));
  const defaultVariant = product.variants[0];
  const price = product.price + (defaultVariant?.price_delta ?? 0);
  const compareAtPrice = product.compare_at_price === null ? null : product.compare_at_price + (defaultVariant?.price_delta ?? 0);
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  return <article className="product-card" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
    <div className="product-visual">
      <Link className="product-image-link" href={`/product/${product.slug}`} aria-label={`View ${product.name}`}><Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 23vw" /></Link>
      {discount > 0 && <span className="product-badge">{discount}% off</span>}
      {!discount && product.is_featured && <span className="product-badge neutral">A good find</span>}
      <button className={`favorite-button ${isSaved ? "selected" : ""}`} aria-label={`${isSaved ? "Unsave" : "Save"} ${product.name}`} aria-pressed={isSaved} onClick={() => toggleSaved(product.id)}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /></button>
      <button className="quick-add" aria-label={`Add ${product.name} to bag`} onClick={() => add(product.id, product.variants[0].id)} disabled={product.stock_quantity < 1}><Plus size={18} /> Quick add</button>
    </div>
    <div className="product-info"><div className="product-meta"><span>{product.brand}</span><Stars rating={product.rating} count={product.review_count} /></div><Link href={`/product/${product.slug}`} className="product-name">{product.name}</Link><div className="product-price"><strong>{money(product.price)}</strong>{product.compare_at_price && <del>{money(product.compare_at_price)}</del>}</div><span className="delivery-note"><Truck size={13} />{product.delivery_days <= 2 ? "2-day delivery available" : "Ships in 3–5 days"}</span></div>
  </article>;
}
