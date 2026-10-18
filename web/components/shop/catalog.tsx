"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX, SlidersHorizontal, X } from "lucide-react";
import { categories, money, products } from "@/data/catalog";
import { ProductCard } from "./product-card";

const swatches: Record<string, string> = { Black: "#282826", White: "#fff", Cream: "#eae1cc", Green: "#8a9c7d", Brown: "#976b4d", Orange: "#cf704b", Mixed: "linear-gradient(135deg,#c9a481 50%,#8b9881 50%)" };
export function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);
  const max = Math.ceil(Math.max(...products.map(p => p.price)) / 10000) * 10000;
  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const limit = Number(params.get("max")) || max;
  const rating = Number(params.get("rating")) || 0;
  const quick = params.get("quick") === "1";
  const deals = params.get("deals") === "1";
  const featured = params.get("featured") === "1";
  const color = params.get("color") || "";
  const sort = params.get("sort") || "recommended";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`/shop?${next}`, { scroll: false });
  }
  const selected = categories.find(item => item.id === category);
  const filtered = products.filter(product => (!category || product.category_id === category) && (!q || `${product.name} ${product.description} ${product.brand} ${categories.find(c => c.id === product.category_id)?.name}`.toLowerCase().includes(q.toLowerCase())) && product.price <= limit && product.rating >= rating && (!quick || product.delivery_days <= 2) && (!deals || product.compare_at_price) && (!featured || product.is_featured) && (!color || product.color === color));
  filtered.sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "rating" ? b.rating - a.rating : Number(b.is_featured) - Number(a.is_featured));
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const visible = filtered.slice((page - 1) * 12, page * 12);
  const title = q ? `Good finds for “${q}”` : selected ? selected.name : deals ? "A little less. A lot to love." : featured ? "The Everyday edit." : "Find your kind of everyday.";
  const hasFilters = category || q || rating || quick || deals || featured || color || limit < max;
  return <div className="container page-space"><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>{selected?.name || "The collection"}</span></div><div className="catalog-intro"><span className="eyebrow">THE GOOD STUFF, THOUGHTFULLY SELECTED</span><h1>{title}</h1><p>{selected?.description || "A considered collection. A simpler way to find what you love."}</p></div><div className="catalog-toolbar"><button className="filter-toggle" aria-expanded={mobileFilters} aria-controls="catalog-filters" onClick={() => setMobileFilters(!mobileFilters)}><SlidersHorizontal size={16} /> Filters</button><span aria-live="polite"><strong>{filtered.length}</strong> good finds</span><label>Sort by <select aria-label="Sort products" value={sort} onChange={event => update("sort", event.target.value)}><option value="recommended">Our picks</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select></label></div><div className="catalog-layout">
      <aside id="catalog-filters" className={`filters ${mobileFilters ? "filters-visible" : ""}`}><div className="filter-heading"><h2>Make it yours</h2>{hasFilters && <Link href="/shop" className="text-link">Clear all</Link>}</div><fieldset><legend>Department</legend><button className={!category ? "category-filter selected" : "category-filter"} onClick={() => update("category", "")}>All departments <span>{products.length}</span></button>{categories.map(item => <button className={`category-filter ${item.id === category ? "selected" : ""}`} onClick={() => update("category", item.id)} key={item.id}>{item.name}<span>{products.filter(p => p.category_id === item.id).length}</span></button>)}</fieldset>
      <fieldset><legend>A price that feels right</legend><label className="range-label" htmlFor="price-range">Up to <strong>{money(limit)}</strong></label><input type="range" id="price-range" aria-label="Maximum price" min="1000" max={max} step="500" value={limit} onChange={event => update("max", event.target.value)} /><div className="range-endpoints"><span>$0</span><span>{money(max)}</span></div></fieldset>
      <fieldset><legend>The little details</legend><label className="checkbox-label"><input type="checkbox" checked={quick} onChange={event => update("quick", event.target.checked ? "1" : "")} />2-day delivery</label><label className="checkbox-label"><input type="checkbox" checked={deals} onChange={event => update("deals", event.target.checked ? "1" : "")} />On a good deal</label><label className="checkbox-label"><input type="checkbox" checked={rating === 4} onChange={event => update("rating", event.target.checked ? "4" : "")} />Rated 4 stars & up</label></fieldset>
      <fieldset><legend>A color for you</legend><div className="color-filters">{Object.entries(swatches).filter(([name]) => products.some(p => p.color === name)).map(([name, background]) => <button key={name} title={name} aria-label={`Filter ${name}`} aria-pressed={color === name} className={color === name ? "selected" : ""} onClick={() => update("color", color === name ? "" : name)}><span style={{ background }} /><small>{name}</small></button>)}</div></fieldset><div className="filter-note">A little clarity goes a long way.<br />All prices in USD. Estimates shown before checkout.</div></aside>
      <section className="catalog-results" aria-label="Product results">{hasFilters && <div className="active-filters">{[["q", q], ["category", selected?.name], ["quick", quick ? "2-day delivery" : ""], ["deals", deals ? "Good deals" : ""], ["featured", featured ? "Our edit" : ""], ["rating", rating ? "4+ stars" : ""], ["color", color], ["max", limit < max ? `Under ${money(limit)}` : ""]].filter(([, value]) => value).map(([key, value]) => <button key={key} onClick={() => update(key!, "")}>{value}<X size={12} /><span className="sr-only">Remove filter</span></button>)}</div>}{visible.length ? <><div className="product-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div><div className="pagination"><button className="button secondary" disabled={page <= 1} onClick={() => update("page", String(page - 1))}><ArrowLeft size={15} /> Previous</button><span>Page {page} of {pages}</span><button className="button secondary" disabled={page >= pages} onClick={() => update("page", String(page + 1))}>Next <ArrowRight size={15} /></button></div></> : <div className="empty-state"><SearchX size={45} /><h2>No good finds this time.</h2><p>Try a broader search or clear a filter. Your next favorite is here somewhere.</p><Link href="/shop" className="button">Reset filters <ArrowRight size={15} /></Link></div>}</section>
    </div></div>;
}
