import Link from "next/link";
import Image from "next/image";
import { categories, money, products } from "@/data/catalog";
import { ProductCard } from "@/components/shop/product-card";

export default function Home() {
  const featured = [products[0], products[8], products[16], products[24]].filter(Boolean);
  const deals = products.filter(p => p.compare_at_price).slice(0, 8);
  const trending = products.slice(4, 12);

  return <div className="amz-home">
    <section className="amz-hero">
      <div className="amz-hero-slide">
        <Image src="/images/hero.webp" alt="Shop everyday essentials" fill priority sizes="100vw" className="amz-hero-img" />
        <div className="amz-hero-overlay" />
        <div className="amz-hero-content">
          <span className="amz-hero-tag">Today&apos;s Deals</span>
          <h1>Shop everyday<br />essentials</h1>
          <p>Free shipping on orders over $50. Easy returns.</p>
          <Link href="/shop" className="amz-hero-btn">Shop now</Link>
        </div>
      </div>
    </section>

    <section className="amz-cat-cards">
      <div className="amz-cat-row">
        {categories.slice(0, 4).map(cat => (
          <Link key={cat.id} href={`/shop?category=${cat.id}`} className="amz-cat-card">
            <h3>{cat.name}</h3>
            <div className="amz-cat-card-img">
              <Image src={cat.image_url} alt={cat.name} fill sizes="25vw" />
            </div>
            <span className="amz-cat-card-link">Shop now</span>
          </Link>
        ))}
      </div>
      <div className="amz-cat-row">
        {categories.slice(4, 8).map(cat => (
          <Link key={cat.id} href={`/shop?category=${cat.id}`} className="amz-cat-card">
            <h3>{cat.name}</h3>
            <div className="amz-cat-card-img">
              <Image src={cat.image_url} alt={cat.name} fill sizes="25vw" />
            </div>
            <span className="amz-cat-card-link">Shop now</span>
          </Link>
        ))}
      </div>
    </section>

    <section className="amz-section">
      <div className="amz-section-head">
        <h2>Deals & Promotions</h2>
        <Link href="/shop?deals=1">See all deals</Link>
      </div>
      <div className="amz-product-grid">
        {deals.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
      </div>
    </section>

    <section className="amz-section">
      <div className="amz-section-head">
        <h2>Trending products</h2>
        <Link href="/shop">See more</Link>
      </div>
      <div className="amz-product-grid">
        {trending.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
      </div>
    </section>

    <section className="amz-section">
      <div className="amz-section-head">
        <h2>Featured picks</h2>
        <Link href="/shop?featured=1">See more</Link>
      </div>
      <div className="amz-product-grid">
        {featured.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
      </div>
    </section>

    <section className="amz-benefits">
      <div className="amz-benefit">
        <div className="amz-benefit-icon">🚚</div>
        <h3>Free Shipping</h3>
        <p>On orders over $50</p>
      </div>
      <div className="amz-benefit">
        <div className="amz-benefit-icon">↩️</div>
        <h3>Easy Returns</h3>
        <p>30-day return policy</p>
      </div>
      <div className="amz-benefit">
        <div className="amz-benefit-icon">🔒</div>
        <h3>Secure Payment</h3>
        <p>100% secure checkout</p>
      </div>
      <div className="amz-benefit">
        <div className="amz-benefit-icon">💬</div>
        <h3>24/7 Support</h3>
        <p>Dedicated customer service</p>
      </div>
    </section>
  </div>;
}
