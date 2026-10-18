"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
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
  return <div className={`cart-lines ${compact ? "compact" : ""}`}>{resolveItems(items).map(item => <article className="cart-line" key={item.variantId}>
    <Link href={`/product/${item.product.slug}`} onClick={() => close(false)} className="cart-line-image"><Image src={item.product.images[0]} width={110} height={120} alt={item.product.name} /></Link>
    <div className="cart-line-body"><Link href={`/product/${item.product.slug}`} onClick={() => close(false)}>{item.product.name}</Link><small className="muted">{item.variant.variant_name}</small><strong>{money(item.unitPrice)}</strong><div className="cart-line-controls"><div className="quantity-control"><button aria-label={`Decrease quantity of ${item.product.name}`} disabled={item.quantity <= 1} onClick={() => change(item.variantId, item.quantity - 1)}><Minus size={13} /></button><output aria-label={`Quantity of ${item.product.name}`}>{item.quantity}</output><button aria-label={`Increase quantity of ${item.product.name}`} disabled={item.quantity >= Math.min(item.variant.stock_quantity, item.product.stock_quantity, 10)} onClick={() => change(item.variantId, item.quantity + 1)}><Plus size={13} /></button></div><button className="text-link save-item" onClick={() => save(item.variantId)} aria-label={`Save ${item.product.name} for later`}><Heart size={13} />{!compact && "Save for later"}</button><button className="icon-button remove-item" aria-label={`Remove ${item.product.name}`} onClick={() => remove(item.variantId)}><Trash2 size={15} /></button></div></div>
    {!compact && <strong className="line-total">{money(item.unitPrice * item.quantity)}</strong>}
  </article>)}</div>;
}
export function PriceSummary({ subtotal, children }: { subtotal: number; children?: React.ReactNode }) {
  const amount = totals(subtotal);
  return <div className="price-summary"><div><span>Subtotal</span><span>{money(amount.subtotal)}</span></div><div><span>Shipping estimate</span><span>{amount.shipping === 0 ? <span className="green">On us</span> : money(amount.shipping)}</span></div><div><span>Estimated tax (8%)</span><span>{money(amount.tax)}</span></div><div className="summary-total"><strong>Estimated total</strong><strong>{money(amount.total)}</strong></div><p className="summary-disclaimer">USD · Simulated tax and shipping. No real payments.</p>{children}</div>;
}
function ShippingProgress({ subtotal }: { subtotal: number }) {
  return <div className="shipping-progress"><p><Truck size={16} />{subtotal >= 5000 ? "Your bag qualifies for free shipping." : <span>You’re {money(5000 - subtotal)} away from free shipping.</span>}</p><div><span style={{ width: `${Math.min(100, subtotal / 50)}%` }} /></div></div>;
}
export function CartDrawer() {
  const open = useShop(state => state.cartOpen);
  const setOpen = useShop(state => state.setCartOpen);
  const items = useShop(state => state.items);
  const lines = resolveItems(items);
  const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return <Sheet open={open} onOpenChange={setOpen}><SheetContent className="bag-drawer"><div className="bag-drawer-title"><SheetTitle>Your good finds <span>({items.reduce((sum, item) => sum + item.quantity, 0)})</span></SheetTitle><SheetDescription>A little something to make every day better.</SheetDescription></div>{lines.length ? <><ShippingProgress subtotal={subtotal} /><div className="drawer-scroll"><CartLines compact /></div><div className="drawer-summary"><PriceSummary subtotal={subtotal}><Link href="/checkout" className="button full" onClick={() => setOpen(false)}>Checkout <ArrowRight size={17} /></Link><Link href="/cart" className="view-bag" onClick={() => setOpen(false)}>View your bag</Link></PriceSummary></div></> : <div className="empty-state"><ShoppingBag size={42} /><h2>A little room for good things.</h2><p>Your bag is empty. Let’s find you a favorite.</p><Link href="/shop" className="button" onClick={() => setOpen(false)}>Explore the collection <ArrowRight size={16} /></Link></div>}</SheetContent></Sheet>;
}
export function CartPage() {
  const items = useShop(state => state.items);
  const hydrated = useShop(state => state.hydrated);
  const saved = useShop(state => state.saved);
  const restore = useShop(state => state.restore);
  const lines = resolveItems(items);
  const subtotal = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!hydrated) return <div className="container page-space" aria-busy="true"><div className="skeleton" style={{ height: 320 }} /></div>;
  return <div className="container page-space"><div className="breadcrumb"><Link href="/">Home</Link><span>/</span>Your bag</div><div className="page-heading"><div><span className="eyebrow">YOUR NEXT FAVORITES</span><h1>The good stuff, all together.</h1><p className="muted">{items.reduce((sum, item) => sum + item.quantity, 0)} items in your bag. Nothing hidden in the total.</p></div><Link href="/shop" className="text-link">Keep exploring <ArrowRight size={16} /></Link></div>{lines.length ? <div className="cart-layout"><section><ShippingProgress subtotal={subtotal} /><CartLines /></section><aside className="panel order-summary"><h2>Order summary</h2><PriceSummary subtotal={subtotal}><Link href="/checkout" className="button full">Continue to checkout <ArrowRight size={17} /></Link></PriceSummary></aside></div> : <div className="empty-state"><ShoppingBag size={46} /><h2>Your next favorite is out there.</h2><p>Your bag is empty, but there’s plenty to discover.</p><Link className="button" href="/shop">Find something good <ArrowRight size={16} /></Link></div>}{saved.length > 0 && <section className="section"><div className="section-heading"><h2>Saved for another day</h2><span className="muted">{saved.length} good finds</span></div><div className="product-grid">{saved.map(item => { const product = products.find(p => p.id === item.productId); return product ? <div key={item.productId}><ProductCard product={product} /><button className="button secondary full" onClick={() => restore(item.productId)}>Move to bag <Plus size={16} /></button></div> : null; })}</div></section>}</div>;
}
export function SavedPage() {
  const saved = useShop(state => state.saved);
  const hydrated = useShop(state => state.hydrated);
  const selected = products.filter(product => saved.some(item => item.productId === product.id));
  return <div className="container page-space"><div className="page-heading"><div><span className="eyebrow">A LITTLE WISHLIST</span><h1>Worth coming back to.</h1><p className="muted">Your favorites, saved on this device.</p></div><Heart size={30} /></div>{!hydrated ? <div className="skeleton" style={{ height: 300 }} /> : selected.length ? <div className="product-grid">{selected.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><Heart size={42} /><h2>Keep the good ones close.</h2><p>Tap the heart on a product to save it here.</p><Link className="button" href="/shop">Explore the collection <ArrowRight size={17} /></Link></div>}</div>;
}
