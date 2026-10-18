"use client";
import Link from "next/link";
import { categories } from "@/data/catalog";

export function Footer() {
  return <footer className="amz-footer">
    <button className="amz-footer-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      Back to top
    </button>
    <div className="amz-footer-main">
      <div>
        <h3>Get to Know Us</h3>
        <Link href="/about">Careers</Link>
        <Link href="/about">About Everyday</Link>
        <Link href="/about">Investor Relations</Link>
        <Link href="/about">Everyday Devices</Link>
      </div>
      <div>
        <h3>Make Money with Us</h3>
        <Link href="/shop">Sell products</Link>
        <Link href="/shop">Become an Affiliate</Link>
        <Link href="/shop">Advertise Your Products</Link>
        <Link href="/shop">Self-Publish with Us</Link>
      </div>
      <div>
        <h3>Payment Products</h3>
        <Link href="/shop">Everyday Business Card</Link>
        <Link href="/shop">Shop with Points</Link>
        <Link href="/shop">Reload Your Balance</Link>
        <Link href="/shop">Everyday Currency Card</Link>
      </div>
      <div>
        <h3>Let Us Help You</h3>
        <Link href="/account">Your Account</Link>
        <Link href="/orders">Your Orders</Link>
        <Link href="/shop">Shipping Rates & Policies</Link>
        <Link href="/shop">Returns & Replacements</Link>
        <Link href="/shop">Help</Link>
      </div>
    </div>
    <div className="amz-footer-bottom">
      <Link href="/" className="amz-footer-logo">everyday<span className="amz-logo-dot">.</span></Link>
      <div className="amz-footer-legal">
        <Link href="/about">Conditions of Use</Link>
        <Link href="/about">Privacy Notice</Link>
        <Link href="/about">Consumer Health Data</Link>
        <span>© 2024, Everyday-demo, Inc. or its affiliates</span>
      </div>
    </div>
  </footer>;
}
