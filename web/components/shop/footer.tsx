"use client";
import Link from "next/link";

export function Footer() {
  return <footer className="amz-footer">
    <button className="amz-footer-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      Back to top
    </button>
    <div className="amz-footer-main">
      <div>
        <h3>Get to Know Us</h3>
        <Link href="/careers">Careers</Link>
        <Link href="/about">About Everyday</Link>
        <Link href="/investors">Investor Relations</Link>
        <Link href="/devices">Everyday Devices</Link>
      </div>
      <div>
        <h3>Make Money with Us</h3>
        <Link href="/sell">Sell products</Link>
        <Link href="/affiliates">Become an Affiliate</Link>
        <Link href="/advertise">Advertise Your Products</Link>
        <Link href="/publishing">Self-Publish with Us</Link>
      </div>
      <div>
        <h3>Payment Products</h3>
        <Link href="/business-card">Everyday Business Card</Link>
        <Link href="/points">Shop with Points</Link>
        <Link href="/reload-balance">Reload Your Balance</Link>
        <Link href="/currency-card">Everyday Currency Card</Link>
      </div>
      <div>
        <h3>Let Us Help You</h3>
        <Link href="/account">Your Account</Link>
        <Link href="/orders">Your Orders</Link>
        <Link href="/shipping">Shipping Rates & Policies</Link>
        <Link href="/returns">Returns & Replacements</Link>
        <Link href="/help">Help</Link>
      </div>
    </div>
    <div className="amz-footer-bottom">
      <Link href="/" className="amz-footer-logo">everyday<span className="amz-logo-dot">.</span></Link>
      <div className="amz-footer-legal">
        <Link href="/conditions">Conditions of Use</Link>
        <Link href="/privacy">Privacy Notice</Link>
        <Link href="/privacy">Consumer Health Data</Link>
        <span>© 2024, Everyday-demo, Inc. or its affiliates</span>
      </div>
    </div>
  </footer>;
}
