import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About this demo | Everyday" };

export default function About() {
  return <div className="container about-content section">
    <p className="eyebrow">A MORE CONSIDERED EVERYDAY</p>
    <h1 className="page-heading">Shopping with a little more thought.</h1>
    <p>Everyday is an independent educational shopping project inspired by the breadth of Amazon, with calmer discovery, clearer prices, and a simpler checkout. It is not affiliated with Amazon or any featured brand.</p>
    <h2>A demo, from bag to checkout.</h2>
    <p>Products, prices, reviews, delivery estimates, and return policies are demonstration data. No real payments are taken, no products are shipped, and no card information is requested. Please use fictional shipping details when testing checkout.</p>
    <h2>The total, upfront.</h2>
    <p>All prices are in US dollars. Simulated shipping is $4.95, or free for orders of $50 or more. Demonstration tax is 8% of the merchandise subtotal; it is not a calculation of actual sales tax.</p>
    <h2>Where the collection comes from.</h2>
    <p>The 64-product collection and its images are sourced from DummyJSON, a development and prototyping dataset. Product descriptions are source sample content, and reviews are explicitly sample reviews, not verified purchases. Manufacturer claims and commercial image reuse rights have not been verified.</p>
    <h2>Your demo account.</h2>
    <p>Guest bags and favorites are stored in your browser. Signing in enables a saved bag, addresses, and order history. Guest order receipts are private to the browser that placed the order. Do not use an Amazon password or real payment details here.</p>
    <Link href="/shop" className="button">Explore the collection</Link>
  </div>;
}
