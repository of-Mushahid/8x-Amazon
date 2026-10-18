"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Clock3, Heart, MapPin, Menu, Search, ShoppingBag, Truck, UserRound, X } from "lucide-react";
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
      setRecent(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string").slice(0, 5) : []);
    } catch { setRecent([]); }
    setOpen(true);
  }
  function clearRecent() {
    setRecent([]);
    try { localStorage.removeItem("everyday-searches"); } catch { /* Keep search usable when storage is blocked. */ }
  }
  const matches = debounced ? products.filter(p => `${p.name} ${p.description} ${p.brand}`.toLowerCase().includes(debounced.toLowerCase())).slice(0, 5) : [];
  function remember(value: string) {
    if (!value.trim()) return;
    const next = [value.trim(), ...recent.filter(item => item !== value.trim())].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem("everyday-searches", JSON.stringify(next)); } catch { /* Search still works when storage is unavailable. */ }
  }
  function search(value = query) {
    remember(value); setOpen(false); setQuery(value); router.push(`/shop${value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ""}`);
  }
  return <>
    <div className="announcement"><span>Good finds. Better every day.</span><span><Truck size={13} /> Free demo shipping on orders $50+ <span className="announcement-divider">|</span> Independent shopping concept</span></div>
    <header className="site-header">
      <div className="container header-main">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu /></button>
        <Link href="/" aria-label="Everyday home" className="wordmark">everyday<span className="logo-dot">.</span><span className="logo-smile" /></Link>
        <div className="search-wrap" ref={searchRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
          <form className="search-form" role="search" onSubmit={event => { event.preventDefault(); if (active >= 0 && matches[active]) { remember(query); setOpen(false); router.push(`/product/${matches[active].slug}`); } else search(); }}>
            <Search size={19} />
            <input aria-label="Search products" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="search-results" aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined} autoComplete="off" placeholder="Find your next everyday favorite" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={openSearch} onKeyDown={event => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "ArrowDown" && matches.length) { event.preventDefault(); setActive(value => (value + 1) % matches.length); setOpen(true); }
              if (event.key === "ArrowUp" && matches.length) { event.preventDefault(); setActive(value => (value - 1 + matches.length) % matches.length); }
            }} />
            {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={15} /></button>}
            <button type="submit" className="search-submit" aria-label="Submit search"><ArrowUpRight size={19} /></button>
          </form>
          {open && <div className="search-popover">
            <div className="eyebrow">{debounced ? "GOOD FINDS, RIGHT THIS WAY" : "A LITTLE INSPIRATION"}</div>
            <div role="listbox" id="search-results">
              {matches.map((product, index) => <button type="button" role="option" aria-selected={active === index} className={`search-result ${active === index ? "active" : ""}`} id={`suggestion-${index}`} key={product.id} onClick={() => { remember(query); setOpen(false); router.push(`/product/${product.slug}`); }}>
                <Image src={product.images[0]} width={48} height={48} alt="" /><span>{product.name}<small>{product.brand}</small></span><strong>{money(product.price)}</strong>
              </button>)}
            </div>
            {debounced && !matches.length && <p className="muted">No matches yet. Try “coffee”, “chair” or “phone”.</p>}
            {!debounced && <div className="recent-searches">{(recent.length ? recent : ["coffee", "home", "laptop"]).map(value => <button key={value} onClick={() => search(value)}><Clock3 size={15} />{value}<ArrowUpRight size={14} /></button>)}{recent.length > 0 && <button className="text-link" onClick={clearRecent}>Clear recent searches</button>}</div>}
            {debounced && <button className="all-results" onClick={() => search()}>See all results for “{query}” <ArrowUpRight size={16} /></button>}
          </div>}
        </div>
        <div className="header-actions">
          <Link href="/account" className="account-link"><UserRound size={20} /><span><small>{user ? "Welcome back" : "Hello, there"}</small>{user ? "Your account" : "Sign in"}</span></Link>
          <Link href="/saved" className="icon-button saved-header" aria-label="Saved favorites"><Heart size={21} /></Link>
          <button className="cart-button" aria-label={`Open shopping bag, ${hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0} items`} onClick={() => cartOpen(true)}><ShoppingBag size={21} /><span className="cart-label">Bag</span><span className="cart-count">{hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0}</span></button>
        </div>
      </div>
      <nav className="container category-nav" aria-label="Shop departments"><Link href="/shop" className="all-categories"><Menu size={16} /> All departments</Link><Link href="/shop?deals=1">Today’s good deals<span className="nav-dot" /></Link>{categories.slice(0, 4).map(category => <Link key={category.id} href={`/shop?category=${category.id}`}>{category.name}</Link>)}<span className="nav-location"><MapPin size={14} /> Delivering across the US</span></nav>
    </header>
    <Sheet open={mobile} onOpenChange={setMobile}><SheetContent side="left" className="mobile-navigation"><SheetTitle>Find your everyday</SheetTitle><SheetDescription>Explore all departments</SheetDescription><Link href="/shop" onClick={() => setMobile(false)}>Shop everything <ArrowUpRight size={16} /></Link>{categories.map(category => <Link href={`/shop?category=${category.id}`} key={category.id} onClick={() => setMobile(false)}>{category.name}<ArrowUpRight size={16} /></Link>)}<Link href="/account" onClick={() => setMobile(false)}>Your account</Link><Link href="/orders" onClick={() => setMobile(false)}>Your orders</Link></SheetContent></Sheet>
  </>;
}
