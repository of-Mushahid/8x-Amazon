import type { Metadata } from "next";
import { StaticPage } from "@/components/shop/static-page";

export const metadata: Metadata = { title: "About Everyday | Everyday", description: "Who we are and how Everyday works." };

export default function AboutPage() {
  return <StaticPage content={{
    slug: "about", title: "About Everyday", subtitle: "An independent storefront built to show how good shopping software should feel.",
    crumbs: [{ label: "Get to Know Us" }, { label: "About Everyday" }],
    blocks: [
      { type: "lead", text: "Everyday is an independent shopping experience inspired by the breadth and polish of modern marketplaces. It brings together search, personalised discovery, a persistent cart, secure checkout and order history into one fast, accessible store." },
      { type: "h2", text: "What we believe" },
      { type: "cards", items: [
        { title: "Customer first", body: "Clear prices, honest totals shown before checkout, and simple returns." },
        { title: "Fast and accessible", body: "Built with modern web technology so it works on any device and for every shopper." },
        { title: "Trust by default", body: "Secure authentication, protected sessions and no surprise charges." },
      ] },
      { type: "h2", text: "How the store works" },
      { type: "bullets", items: [
        "Browse thousands of products across categories, or search and filter to find exactly what you want.",
        "Add items to your cart as a guest — your cart is saved in your browser.",
        "Sign in to keep a saved cart, addresses, favourites and a full order history.",
        "Check out securely with simulated payment; no real card is ever charged.",
      ] },
      { type: "p", text: "Product data, prices, reviews and imagery are demonstration content sourced for prototyping. Everyday is not affiliated with, or an official product of, any brand shown." },
      { type: "cta", label: "Start shopping", href: "/shop" },
    ],
    related: [
      { label: "Careers", href: "/careers" },
      { label: "Investor relations", href: "/investors" },
      { label: "Everyday devices", href: "/devices" },
      { label: "Sell on Everyday", href: "/sell" },
      { label: "Help", href: "/help" },
    ],
  }} />;
}
