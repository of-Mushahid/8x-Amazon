"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { money, totals, products } from "@/data/catalog";
import { resolveItems, useShop } from "@/lib/store";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ProductCard } from "./product-card";

export function CartLines({ compact = false }: { compact?: boolean }) {
  const items = useShop(state => state.items);
  const change = useShop(state => state.setQuantity);
  const remove = useShop(state => state.remove);
  const save = useShop(state => state.saveForLater);
  const close = useShop(state => state.setCartOpen);
  return <div className={`amz-cart-lines ${compact ? "compact" : ""}`}>{resolveItems(items).map(item => <div className="amz-cart-item" key={item.variantId}>
    <Link href={`/product/${item.product.slug}`} onClick={() => close(false)} className="amz-cart-img">
      <Image src={item.product.images[0]} width={180} height={180} alt={item.product.name} />
    </Link>
    <div className="amz-cart-info">
      <Link href={`/product/${item.product.slug}`} onClick={() => close(false)} className="amz-cart-name">{item.product.name}</Link>
      <small className="amz-cart-variant">{item.variant.variant_name}</small>
      <div className="amz-cart-price-line">
        <span className="amz-price">{money(item.unitPrice)}</span>
      </div>
      <div className="amz-cart-controls">
        <div className="amz-qty">
          <button aria-label={`Decrease quantity of ${item.product.name}`} disabled={item.quantity <= 1} onClick={() => change(item.variantId, item.quantity - 1)}>−</button>
          <span>{item.quantity}</span>
          <button aria-label={`Increase quantity of ${item.product.name}`} disabled={item.quantity >= Math.min(item.variant.stock_quantity, item.product.stock_quantity, 10)} onClick={() => change(item.variantId, item.quantity + 1)}>+</button>
        </div>
        <span className="amz-cart-divider">|</span>
        <button className="amz-cart-action" onClick={() => save(item.variantId)}>Save for later</button>
        <span className="amz-cart-divider">|</span>
        <button className="amz-cart-action amz-cart-delete" aria-label={`Remove ${item.product.name}`} onClick={() => remove(item.variantId)}>Delete</button>
      </div>
      <div className="amz-cart-stock">In Stock</div>
    </div>
    {!compact && <div className="amz-cart-line-total">
      <strong className="amz-price">{money(item.unitPrice * item.quantity)}</strong>
    </div>}
  </div>)}</div>;
}

export function PriceSummary({ subtotal, children }: { subtotal: number; children?: React.ReactNode }) {
  const amount = totals(subtotal);
  return <div className="amz-summary">
    <h3>Order Summary</h3>
    <div className="amz-summary-row"><span>Items:</span><span>{money(amount.subtotal)}</span></div>
    <div className="amz-summary-row"><span>Shipping & handling:</span><span>{amount.shipping === 0 ? "FREE" : money(amount.shipping)}</span></div>
    <div className="amz-summary-row"><span>Total before tax:</span><span>{money(amount.subtotal + amount.shipping)}</span></div>
    <div className="amz-summary-row"><span>Estimated tax (8%):</span><span>{money(amount.tax)}</span></div>
    <div className="amz-summary-total"><span>Order total:</span><strong className="amz-price">{money(amount.total)}</strong></div>
    {children}
  </div>;
}

function ShippingProgress({ subtotal }: { subtotal: number }) {
  const pct = Math.min(100, subtotal / 50);
  return <div className="amz-shipping-bar">
    {subtotal >= 5000
      ? <p><span className="amz-free-badge">FREE Shipping</span> Your order qualifies for free shipping</p>
      : <p>Add <strong className="amz-price">{money(5000 - subtotal)}</strong> of eligible items for <span className="amz-free-badge">FREE Shipping</span></p>}
    <div className="amz-progress"><span style={{ width: `${pct}%` }} /></div>
  </div>;
}

export function CartDrawer() {
  const open = useShop(state => state.cartOpen);
  const setOpen = useShop(state => state.setCartOpen);
  const items = useShop(state => state.items);
  const lines = resolveItems(items);
  const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side="right" className="amz-drawer">
      <SheetTitle className="amz-drawer-title">Shopping Cart ({count})</SheetTitle>
      <SheetDescription>Review your items before checkout</SheetDescription>
      {lines.length ? <>
        <ShippingProgress subtotal={subtotal} />
        <div className="amz-drawer-scroll"><CartLines compact /></div>
        <div className="amz-drawer-summary">
          <div className="amz-drawer-total">
            <span>Subtotal ({count} items):</span>
            <strong className="amz-price-lg">{money(subtotal)}</strong>
          </div>
          <Link href="/checkout" className="amz-buy-btn" onClick={() => setOpen(false)}>Proceed to checkout</Link>
        </div>
      </> : <div className="amz-empty-cart">
        <ShoppingCart size={60} />
        <h2>Your Amazon Cart is empty</h2>
        <p>Your shopping cart lives here. Go ahead, fill it up.</p>
        <Link href="/shop" className="amz-buy-btn" onClick={() => setOpen(false)}>Continue shopping</Link>
      </div>}
    </SheetContent>
  </Sheet>;
}

export function CartPage() {
  const items = useShop(state => state.items);
  const hydrated = useShop(state => state.hydrated);
  const saved = useShop(state => state.saved);
  const restore = useShop(state => state.restore);
  const lines = resolveItems(items);
  const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!hydrated) return <div className="amz-container amz-page" aria-busy="true"><div className="amz-skeleton" style={{ height: 320 }} /></div>;
  return <div className="amz-container amz-page">
    <div className="amz-breadcrumb"><Link href="/">Home</Link><span> › </span><span>Shopping Cart</span></div>
    {lines.length ? <div className="amz-cart-layout">
      <div>
        <h1 className="amz-cart-title">Shopping Cart</h1>
        <ShippingProgress subtotal={subtotal} />
        <CartLines />
        <div className="amz-cart-subtotal-bar">
          <span>Subtotal ({lines.reduce((s, i) => s + i.quantity, 0)} items): <strong className="amz-price-lg">{money(subtotal)}</strong></span>
        </div>
      </div>
      <aside className="amz-cart-sidebar">
        <PriceSummary subtotal={subtotal}>
          <Link href="/checkout" className="amz-buy-btn">Proceed to checkout</Link>
        </PriceSummary>
      </aside>
    </div> : <div className="amz-empty-cart">
      <ShoppingCart size={80} />
      <h2>Your Amazon Cart is empty.</h2>
      <p>Your shopping cart lives here. Go ahead, fill it up.</p>
      <Link className="amz-buy-btn" href="/shop">Continue shopping</Link>
    </div>}
    {saved.length > 0 && <section className="amz-saved-section">
      <h2>Saved for later ({saved.length} items)</h2>
      <div className="amz-saved-grid">
        {saved.map(item => {
          const product = products.find(p => p.id === item.productId);
          return product ? <div key={item.productId} className="amz-saved-item">
            <Image src={product.images[0]} width={100} height={100} alt={product.name} />
            <div>
              <Link href={`/product/${product.slug}`}>{product.name}</Link>
              <span className="amz-price">{money(product.price)}</span>
              <button className="amz-cart-action" onClick={() => restore(item.productId)}>Move to Cart</button>
            </div>
          </div> : null;
        })}
      </div>
    </section>}
  </div>;
}

export function SavedPage() {
  const saved = useShop(state => state.saved);
  const hydrated = useShop(state => state.hydrated);
  const selected = products.filter(product => saved.some(item => item.productId === product.id));
  return <div className="amz-container amz-page">
    <h1 className="amz-page-title">Saved for later ({selected.length})</h1>
    {!hydrated ? <div className="amz-skeleton" style={{ height: 300 }} /> : selected.length ? <div className="amz-product-grid">{selected.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="amz-empty-cart">
      <Heart size={60} />
      <h2>No saved items</h2>
      <p>Tap the heart on a product to save it here.</p>
      <Link className="amz-buy-btn" href="/shop">Continue shopping</Link>
    </div>}
  </div>;
}
