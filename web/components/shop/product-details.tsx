"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Heart, Minus, Plus, ShieldCheck, ShoppingCart, Truck, RotateCcw, ChevronRight } from "lucide-react";
import { categories, money, products, totals } from "@/data/catalog";
import type { Product } from "@/lib/types";
import { useShop } from "@/lib/store";
import { ProductCard, Stars } from "./product-card";
import { useSession } from "./providers";

export function ProductDetails({ product }: { product: Product }) {
  const [image, setImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const touch = useRef(0);
  const add = useShop(state => state.add);
  const setCartOpen = useShop(state => state.setCartOpen);
  const toggleSaved = useShop(state => state.toggleSaved);
  const saved = useShop(state => state.hydrated && state.saved.some(item => item.productId === product.id));
  const { user } = useSession();
  const variant = product.variants.find(item => item.id === variantId)!;
  const price = product.price + variant.price_delta;
  const amount = totals(price * quantity);
  const category = categories.find(item => item.id === product.category_id);
  const related = products.filter(item => item.category_id === product.category_id && item.id !== product.id).slice(0, 4);
  const deal = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;

  function step(amount: number) { setImage(value => (value + amount + product.images.length) % product.images.length); }

  function handleAdd() {
    add(product.id, variantId, quantity);
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return <div className="amz-pdp">
    <nav className="amz-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link><span> › </span>
      <Link href={`/shop?category=${category?.id}`}>{category?.name}</Link><span> › </span>
      <span>{product.name}</span>
    </nav>

    <div className="amz-pdp-layout">
      <section className="amz-gallery" aria-label="Product images">
        <div className="amz-gallery-main"
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onTouchStart={event => { touch.current = event.touches[0].clientX; }}
          onTouchEnd={event => { const change = event.changedTouches[0].clientX - touch.current; if (Math.abs(change) > 40) step(change > 0 ? -1 : 1); }}>
          <Image src={product.images[image]} alt={`${product.name}, view ${image + 1}`} fill priority sizes="(max-width: 900px) 100vw, 40vw" />
          {deal > 0 && <span className="amz-deal-badge">-{deal}%</span>}
          {product.images.length > 1 && <div className="amz-gallery-nav">
            <button onClick={() => step(-1)} aria-label="Previous image">‹</button>
            <span>{image + 1} / {product.images.length}</span>
            <button onClick={() => step(1)} aria-label="Next image">›</button>
          </div>}
        </div>
        <div className="amz-gallery-thumbs">
          {product.images.map((src, index) => (
            <button key={src} className={image === index ? "amz-thumb-active" : ""} onClick={() => setImage(index)} aria-label={`View image ${index + 1}`}>
              <Image src={src} alt="" width={56} height={56} />
            </button>
          ))}
        </div>
      </section>

      <section className="amz-pdp-info">
        <h1 className="amz-pdp-title">{product.name}</h1>
        <div className="amz-pdp-brand">
          <span>Brand: <Link href={`/shop?brand=${product.brand}`}>{product.brand}</Link></span>
          <span className="amz-pdp-divider">|</span>
          <Link href="#reviews"><Stars rating={product.rating} count={product.review_count} /> {product.rating} ratings</Link>
        </div>
        <hr className="amz-pdp-hr" />
        <div className="amz-pdp-price-block">
          {deal > 0 && <span className="amz-deal-label">{deal}% off</span>}
          <span className="amz-price-lg">{money(price)}</span>
          {product.compare_at_price && <span className="amz-price-was">List: <del>{money(product.compare_at_price + variant.price_delta)}</del></span>}
        </div>
        <p className="amz-pdp-desc">{product.description}</p>

        <div className="amz-pdp-variants">
          <label>Variant: <strong>{variant.variant_name}</strong></label>
          <div className="amz-variant-options">
            {product.variants.map(item => (
              <button key={item.id} className={variantId === item.id ? "amz-variant-active" : ""} onClick={() => { setVariantId(item.id); setQuantity(1); }}>
                {item.variant_name}
                {item.price_delta > 0 && ` (+${money(item.price_delta)})`}
              </button>
            ))}
          </div>
        </div>

        <div className="amz-pdp-stock">
          {Math.min(product.stock_quantity, variant.stock_quantity) <= 5
            ? <span className="amz-stock-low">Only {Math.min(product.stock_quantity, variant.stock_quantity)} left in stock - order soon.</span>
            : <span className="amz-stock-ok">In Stock</span>}
        </div>

        <div className="amz-pdp-qty">
          <label>Qty:</label>
          <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
            {Array.from({ length: Math.min(10, variant.stock_quantity, product.stock_quantity) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button className="amz-add-cart-btn" onClick={handleAdd} disabled={variant.stock_quantity <= 0}>
          <ShoppingCart size={18} /> Add to Cart
        </button>
        <button className="amz-buy-now-btn" onClick={() => { add(product.id, variantId, quantity); window.location.href = "/checkout"; }} disabled={variant.stock_quantity <= 0}>
          Buy Now
        </button>

        <div className="amz-pdp-meta">
          <button className={`amz-pdp-save ${saved ? "saved" : ""}`} onClick={() => { if (!user) return; toggleSaved(product.id); }}>
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save for later"}
          </button>
        </div>

        <div className="amz-pdp-shipping">
          <div><Truck size={18} /> <span>FREE delivery <strong>Tomorrow</strong> on orders over $50</span></div>
          <div><RotateCcw size={18} /> <span>30-day returns policy</span></div>
          <div><ShieldCheck size={18} /> <span>Secure transaction</span></div>
        </div>
      </section>

      <aside className="amz-pdp-sidebar">
        <div className="amz-sidebar-price">{money(price)}</div>
        <div className="amz-sidebar-delivery">
          <span>FREE delivery <strong>Tomorrow</strong></span>
          <small>Or fastest delivery Today</small>
        </div>
        <div className="amz-pdp-stock">
          {Math.min(product.stock_quantity, variant.stock_quantity) <= 5
            ? <span className="amz-stock-low">Only {Math.min(product.stock_quantity, variant.stock_quantity)} left</span>
            : <span className="amz-stock-ok">In Stock</span>}
        </div>
        <button className="amz-add-cart-btn" onClick={handleAdd} disabled={variant.stock_quantity <= 0}>
          <ShoppingCart size={18} /> Add to Cart
        </button>
        <button className="amz-buy-now-btn" onClick={() => { add(product.id, variantId, quantity); window.location.href = "/checkout"; }} disabled={variant.stock_quantity <= 0}>
          Buy Now
        </button>
        <div className="amz-sidebar-secure">
          <ShieldCheck size={16} /> Secure transaction
        </div>
        <div className="amz-sidebar-details">
          <div><span>Ships from</span><span>Everyday</span></div>
          <div><span>Sold by</span><span>Everyday</span></div>
          <div><span>Returns</span><Link href="/shop">30-day returns</Link></div>
        </div>
      </aside>
    </div>

    {zoom && <div className="amz-zoom-overlay" onClick={() => setZoom(false)}>
      <Image src={product.images[image]} alt={`${product.name}, zoomed`} fill sizes="80vw" />
    </div>}

    <section className="amz-pdp-features">
      <h2>About this item</h2>
      <ul>
        {product.features.map((feature, i) => <li key={i}><Check size={16} /> {feature}</li>)}
      </ul>
      <div className="amz-pdp-specs">
        <div><span>Brand</span><span>{product.brand}</span></div>
        <div><span>Color</span><span>{product.color}</span></div>
        <div><span>Category</span><span>{category?.name}</span></div>
      </div>
    </section>

    <section className="amz-pdp-reviews" id="reviews">
      <h2>Customer reviews</h2>
      <div className="amz-reviews-summary">
        <Stars rating={product.rating} />
        <span>{product.rating} out of 5</span>
        <span className="amz-review-count">{product.review_count} global ratings</span>
      </div>
      <div className="amz-reviews-list">
        {product.reviews.map(review => (
          <article key={review.id} className="amz-review">
            <div className="amz-review-header">
              <span className="amz-review-author">{review.author.replace(" (sample reviewer)", "")}</span>
              <Stars rating={review.rating} />
            </div>
            <h3>{review.title}</h3>
            <p>{review.body}</p>
            <small className="amz-verified">Verified Purchase</small>
          </article>
        ))}
      </div>
    </section>

    <section className="amz-pdp-related">
      <h2>Products related to this item</h2>
      <div className="amz-product-grid">
        {related.map(item => <ProductCard key={item.id} product={item} />)}
      </div>
    </section>
  </div>;
}
