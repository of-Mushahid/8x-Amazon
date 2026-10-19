import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { categories, products } from "@/data/catalog";
import { ProductCard } from "@/components/shop/product-card";

const tileStyles: Record<string, { bg: string; heading: string }> = {
  tech: { bg: "#e7eef7", heading: "Level up your tech" },
  home: { bg: "#efe9df", heading: "Refresh your space" },
  kitchen: { bg: "#e6efe4", heading: "Shop kitchen must-haves" },
  style: { bg: "#f3e6ea", heading: "Start looking sharp" },
  sports: { bg: "#e6eef0", heading: "Gear up to get fit" },
  beauty: { bg: "#f1e7f0", heading: "Shop all things beauty" },
  workspace: { bg: "#ececec", heading: "Build your best desk" },
  essentials: { bg: "#eef1e4", heading: "Stock up and save" },
};

export default function Home() {
  const deals = products.filter(p => p.compare_at_price).slice(0, 4);
  const trending = products.slice(0, 4);
  const featured = [products[0], products[8], products[16], products[24]].filter(Boolean);
  const byCategory = (id: string) => products.filter(p => p.category_id === id);
  const cardCategories = categories.slice(0, 4);

  return <div className="amz-home">
    <section className="amz-hero-carousel" aria-label="Featured categories">
      <div className="amz-hero-track">
        {categories.map(cat => {
          const style = tileStyles[cat.id] ?? { bg: "#eaeaea", heading: cat.name };
          const img = byCategory(cat.id)[0];
          return <Link key={cat.id} href={`/shop?category=${cat.id}`} className="amz-hero-tile" style={{ background: style.bg }}>
            <h3>{style.heading}</h3>
            {img && <div className="amz-hero-tile-img"><Image src={img.images[0]} alt={img.name} fill sizes="(max-width: 600px) 60vw, 260px" /></div>}
            <span className="amz-hero-tile-cta">Shop now</span>
          </Link>;
        })}
      </div>
    </section>

    <section className="amz-home-cards">
      {cardCategories.map(cat => {
        const items = byCategory(cat.id).slice(0, 4);
        return <Link key={cat.id} href={`/shop?category=${cat.id}`} className="amz-home-card">
          <h3>{cat.name}<ChevronRight size={18} className="amz-home-card-chevron" /></h3>
          <div className="amz-home-cardgrid">
            {items.map(p => <div key={p.id} className="amz-home-cardcell"><Image src={p.images[0]} alt={p.name} fill sizes="(max-width: 600px) 45vw, 260px" /></div>)}
          </div>
          <span className="amz-home-cardlink">See more</span>
        </Link>;
      })}
    </section>

    <section className="amz-section">
      <div className="amz-section-head"><h2>Today&apos;s deals</h2><Link href="/shop?deals=1">See all deals</Link></div>
      <div className="amz-product-grid">{deals.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </section>

    <section className="amz-section">
      <div className="amz-section-head"><h2>Trending now</h2><Link href="/shop">See more</Link></div>
      <div className="amz-product-grid">{trending.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </section>

    <section className="amz-section">
      <div className="amz-section-head"><h2>Recommended for you</h2><Link href="/shop?featured=1">See more</Link></div>
      <div className="amz-product-grid">{featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </section>

    <section className="amz-benefits">
      <div className="amz-benefit"><div className="amz-benefit-icon">🚚</div><h3>Free Shipping</h3><p>On orders over $50</p></div>
      <div className="amz-benefit"><div className="amz-benefit-icon">↩️</div><h3>Easy Returns</h3><p>30-day return policy</p></div>
      <div className="amz-benefit"><div className="amz-benefit-icon">🔒</div><h3>Secure Payment</h3><p>100% secure checkout</p></div>
      <div className="amz-benefit"><div className="amz-benefit-icon">💬</div><h3>24/7 Support</h3><p>Dedicated customer service</p></div>
    </section>
  </div>;
}
