"use client";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/data/catalog";
import { useShop } from "@/lib/store";
import { useSession } from "./providers";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating);
  return <span className="amz-stars-inline" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < full ? "amz-star-full" : "amz-star-empty"}>★</span>)}
    {count !== undefined && <span className="amz-star-count">{count.toLocaleString()}</span>}
  </span>;
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const saved = useShop(state => state.saved);
  const toggleSaved = useShop(state => state.toggleSaved);
  const add = useShop(state => state.add);
  const setCartOpen = useShop(state => state.setCartOpen);
  const { user } = useSession();
  const isSaved = saved.some(item => item.productId === product.id);
  const deal = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  const variantId = product.variants[0]?.id ?? "";

  return <article className="amz-card" style={{ animationDelay: `${index * 55}ms` }}>
    <Link href={`/product/${product.slug}`} className="amz-card-image">
      {deal > 0 && <span className="amz-deal-badge">-{deal}%</span>}
      <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 650px) 50vw, (max-width: 900px) 33vw, 25vw" />
    </Link>
    <div className="amz-card-body">
      <div className="amz-card-rating">
        <span className="amz-stars" style={{ "--rating": product.rating } as React.CSSProperties} />
        <span className="amz-rating-count">{product.review_count > 1000 ? `${(product.review_count / 1000).toFixed(1)}k` : product.review_count}</span>
      </div>
      <Link href={`/product/${product.slug}`} className="amz-card-name">{product.name}</Link>
      <div className="amz-card-price">
        {product.compare_at_price && <span className="amz-card-was">{money(product.compare_at_price)}</span>}
        <span className="amz-card-now">{money(product.price)}</span>
      </div>
      <div className="amz-card-delivery">
        <span>FREE delivery <strong>Tomorrow</strong></span>
      </div>
      <div className="amz-card-actions">
        <button className="amz-add-btn" onClick={() => { add(product.id, variantId, 1); setCartOpen(true); }}>
          Add to Cart
        </button>
        <button className={`amz-save-btn ${isSaved ? "saved" : ""}`} aria-label={isSaved ? "Remove from saved" : "Save for later"}
          onClick={() => {
            if (!user) return;
            toggleSaved(product.id);
          }}>
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  </article>;
}
