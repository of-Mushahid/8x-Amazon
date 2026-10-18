"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, MapPin, Menu, Search, ShoppingCart, X } from "lucide-react";
import { categories, money, products } from "@/data/catalog";
import { useShop } from "@/lib/store";
import { useSession } from "./providers";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("all");
  const searchRef = useRef<HTMLDivElement>(null);
  const items = useShop(state => state.items);
  const hydrated = useShop(state => state.hydrated);
  const cartOpen = useShop(state => state.setCartOpen);
  const { user } = useSession();

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(query.trim()); setActive(-1); }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!searchRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function openSearch() {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("everyday-searches") || "[]");
      setRecent(Array.isArray(stored) ? stored.filter((v): v is string => typeof v === "string").slice(0, 5) : []);
    } catch { setRecent([]); }
    setOpen(true);
  }

  function clearRecent() { setRecent([]); localStorage.removeItem("everyday-searches"); }

  function saveRecent(term: string) {
    const next = [term, ...recent.filter(r => r !== term)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("everyday-searches", JSON.stringify(next));
  }

  const results = debounced.length < 2 ? [] : products.filter(p =>
    p.name.toLowerCase().includes(debounced.toLowerCase()) ||
    p.description.toLowerCase().includes(debounced.toLowerCase())
  ).slice(0, 5);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!debounced) return;
    saveRecent(debounced);
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(debounced)}${catFilter !== "all" ? `&category=${catFilter}` : ""}`);
  }

  function pickResult(product: typeof products[number]) {
    saveRecent(query.trim());
    setOpen(false);
    setQuery("");
    router.push(`/product/${product.slug}`);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pickResult(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return <>
    <header className="amz-header">
      <div className="amz-header-main">
        <button className="amz-nav-link amz-nav-location-btn" onClick={() => setMobile(true)} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <Link href="/" className="amz-logo" aria-label="Everyday home">
          everyday<span className="amz-logo-dot">.</span>
        </Link>
        <div className="amz-delivery">
          <MapPin size={18} />
          <div>
            <span className="amz-delivery-label">Deliver to</span>
            <span className="amz-delivery-address">United States</span>
          </div>
        </div>
        <div className="amz-search-wrap" ref={searchRef}>
          <form onSubmit={submitSearch} role="search" className="amz-search-form">
            <select className="amz-search-cat" value={catFilter} onChange={e => setCatFilter(e.target.value)} aria-label="Search category">
              <option value="all">All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="search" value={query} placeholder="Search everyday"
              onChange={e => setQuery(e.target.value)} onFocus={openSearch} onKeyDown={handleKey}
              aria-label="Search products" aria-expanded={open} aria-controls="search-popover" aria-autocomplete="list"
            />
            <button type="submit" className="amz-search-btn" aria-label="Search">
              <Search size={20} />
            </button>
          </form>
          {open && <div className="amz-search-popover" id="search-popover" role="listbox">
            {results.length > 0 ? results.map((product, i) => (
              <button key={product.id} role="option" aria-selected={i === active}
                className={`amz-search-result ${i === active ? "active" : ""}`}
                onClick={() => pickResult(product)} onMouseEnter={() => setActive(i)}>
                <Image src={product.images[0]} alt="" width={40} height={40} />
                <div className="amz-search-result-text">
                  <span>{product.name}</span>
                  <strong>{money(product.price)}</strong>
                </div>
              </button>
            )) : debounced.length >= 2 ? <div className="amz-search-empty">No results for &ldquo;{debounced}&rdquo;</div> : <>
              {recent.length > 0 && <div className="amz-search-recent">
                <div className="amz-search-recent-head">
                  <span>Recent searches</span>
                  <button type="button" onClick={clearRecent}>Clear</button>
                </div>
                {recent.map(term => (
                  <button key={term} type="button" onClick={() => { setQuery(term); setDebounced(term); }}>
                    <Search size={14} /> {term}
                  </button>
                ))}
              </div>}
            </>}
            {debounced.length >= 2 && <button type="button" className="amz-search-all" onClick={submitSearch as () => void}>
              See all results for &ldquo;{debounced}&rdquo;
            </button>}
          </div>}
        </div>
        <div className="amz-header-actions">
          <Link href={user ? "/account" : "/sign-in"} className="amz-nav-link amz-account-link">
            <span className="amz-nav-line1">{user ? "Hello" : "Hello, sign in"}</span>
            <span className="amz-nav-line2">Account & Lists <ChevronDown size={10} /></span>
          </Link>
          <Link href="/orders" className="amz-nav-link amz-orders-link">
            <span className="amz-nav-line1">Returns</span>
            <span className="amz-nav-line2">& Orders</span>
          </Link>
          <button className="amz-cart-btn" onClick={() => cartOpen(true)} aria-label={`Cart, ${count} items`}>
            <ShoppingCart size={28} />
            <span className="amz-cart-count">{count}</span>
            <span className="amz-nav-line2">Cart</span>
          </button>
        </div>
      </div>
      <nav className="amz-subnav">
        <button className="amz-subnav-link" onClick={() => setMobile(true)}>
          <Menu size={18} /> All
        </button>
        <Link href="/shop?deals=1" className="amz-subnav-link">Today&apos;s Deals</Link>
        <Link href="/help" className="amz-subnav-link">Customer Service</Link>
        <Link href="/registry" className="amz-subnav-link">Registry</Link>
        <Link href="/gift-cards" className="amz-subnav-link">Gift Cards</Link>
        <Link href="/sell" className="amz-subnav-link">Sell</Link>
      </nav>
    </header>
    <Sheet open={mobile} onOpenChange={setMobile}>
      <SheetContent side="left" className="amz-mobile-menu">
        <SheetTitle>Navigation</SheetTitle>
        <SheetDescription>Browse categories and pages</SheetDescription>
        <div className="amz-mobile-profile">
          <Heart size={22} /> <span>{user ? "Your account" : "Hello, sign in"}</span>
        </div>
        <nav className="amz-mobile-nav">
          <Link href="/shop" onClick={() => setMobile(false)}>All Products</Link>
          <div className="amz-mobile-trending">
            <strong>Trending</strong>
            <Link href="/shop?deals=1" onClick={() => setMobile(false)}>Deals</Link>
            <Link href="/saved" onClick={() => setMobile(false)}>Saved</Link>
          </div>
          <div className="amz-mobile-cats">
            <strong>Shop by category</strong>
            {categories.map(c => <Link key={c.id} href={`/shop?category=${c.id}`} onClick={() => setMobile(false)}>{c.name}</Link>)}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  </>;
}
