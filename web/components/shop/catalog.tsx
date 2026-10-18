"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, SearchX, SlidersHorizontal, X } from "lucide-react";
import { categories, money, products } from "@/data/catalog";
import { ProductCard } from "./product-card";

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
  const sort = params.get("sort") || "featured";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`/shop?${next}`, { scroll: false });
  }

  const selected = categories.find(item => item.id === category);
  const filtered = products.filter(product =>
    (!category || product.category_id === category) &&
    (!q || `${product.name} ${product.description} ${product.brand}`.toLowerCase().includes(q.toLowerCase())) &&
    product.price <= limit &&
    product.rating >= rating &&
    (!quick || product.delivery_days <= 2) &&
    (!deals || product.compare_at_price) &&
    (!featured || product.is_featured)
  );
  filtered.sort((a, b) =>
    sort === "price-low" ? a.price - b.price :
    sort === "price-high" ? b.price - a.price :
    sort === "rating" ? b.rating - a.rating :
    sort === "newest" ? Number(b.is_featured) - Number(a.is_featured) :
    Number(b.is_featured) - Number(a.is_featured)
  );

  const pages = Math.max(1, Math.ceil(filtered.length / 16));
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const visible = filtered.slice((page - 1) * 16, page * 16);
  const title = q ? `Results for "${q}"` : selected ? selected.name : deals ? "Today's Deals" : "All Products";
  const hasFilters = category || q || rating || quick || deals || featured || limit < max;

  return <div className="amz-container amz-page">
    <div className="amz-breadcrumb">
      <Link href="/">Home</Link><span> › </span>
      <Link href="/shop">Products</Link>
      {selected && <><span> › </span><span>{selected.name}</span></>}
    </div>

    <div className="amz-catalog-layout">
      <aside className={`amz-filters ${mobileFilters ? "amz-filters-open" : ""}`}>
        <div className="amz-filter-header">
          <h2>Filters</h2>
          {hasFilters && <button className="amz-filter-clear" onClick={() => router.replace("/shop")}>Clear all</button>}
        </div>

        <div className="amz-filter-group">
          <h3>Department</h3>
          <ul className="amz-filter-list">
            <li>
              <button className={!category ? "amz-filter-link active" : "amz-filter-link"} onClick={() => update("category", "")}>
                All Departments
              </button>
            </li>
            {categories.map(item => (
              <li key={item.id}>
                <button className={item.id === category ? "amz-filter-link active" : "amz-filter-link"} onClick={() => update("category", item.id)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="amz-filter-group">
          <h3>Customer Review</h3>
          {[4, 3, 2].map(stars => (
            <label key={stars} className="amz-filter-check">
              <input type="radio" name="rating" checked={rating === stars} onChange={() => update("rating", rating === stars ? "" : String(stars))} />
              <span className="amz-stars-sm" style={{ "--rating": stars } as React.CSSProperties} />
              <span>& Up</span>
            </label>
          ))}
        </div>

        <div className="amz-filter-group">
          <h3>Price</h3>
          <label className="amz-price-range">
            <span>Under {money(limit)}</span>
            <input type="range" min="1000" max={max} step="500" value={limit} onChange={e => update("max", e.target.value)} />
          </label>
          <div className="amz-range-labels"><span>$0</span><span>{money(max)}</span></div>
        </div>

        <div className="amz-filter-group">
          <h3>Shipping</h3>
          <label className="amz-filter-check">
            <input type="checkbox" checked={quick} onChange={e => update("quick", e.target.checked ? "1" : "")} />
            <span>FREE Shipping</span>
          </label>
        </div>

        <div className="amz-filter-group">
          <h3>Deals & Discounts</h3>
          <label className="amz-filter-check">
            <input type="checkbox" checked={deals} onChange={e => update("deals", e.target.checked ? "1" : "")} />
            <span>All Deals</span>
          </label>
        </div>
      </aside>

      <section className="amz-catalog-results">
        <div className="amz-catalog-bar">
          <button className="amz-filter-toggle" onClick={() => setMobileFilters(!mobileFilters)}>
            <SlidersHorizontal size={16} /> Filters
          </button>
          <span className="amz-result-count">{filtered.length.toLocaleString()} results</span>
          <div className="amz-sort-wrap">
            <span>Sort by:</span>
            <select value={sort} onChange={e => update("sort", e.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Avg. Customer Review</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {hasFilters && <div className="amz-active-filters">
          {selected && <button onClick={() => update("category", "")}>{selected.name} <X size={12} /></button>}
          {q && <button onClick={() => update("q", "")}>"{q}" <X size={12} /></button>}
          {rating > 0 && <button onClick={() => update("rating", "")}>{rating}+ stars <X size={12} /></button>}
          {quick && <button onClick={() => update("quick", "")}>Free Shipping <X size={12} /></button>}
          {deals && <button onClick={() => update("deals", "")}>Deals <X size={12} /></button>}
          {limit < max && <button onClick={() => update("max", "")}>Under {money(limit)} <X size={12} /></button>}
        </div>}

        {visible.length ? <>
          <div className="amz-product-grid">
            {visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>
          {pages > 1 && <div className="amz-pagination">
            <button disabled={page <= 1} onClick={() => update("page", String(page - 1))}>← Previous</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === page ? "amz-page-active" : ""} onClick={() => update("page", String(p))}>{p}</button>
            ))}
            <button disabled={page >= pages} onClick={() => update("page", String(page + 1))}>Next →</button>
          </div>}
        </> : <div className="amz-no-results">
          <SearchX size={50} />
          <h2>No results found</h2>
          <p>Try checking your spelling or use different words</p>
          <Link href="/shop" className="amz-buy-btn">Reset filters</Link>
        </div>}
      </section>
    </div>
  </div>;
}
