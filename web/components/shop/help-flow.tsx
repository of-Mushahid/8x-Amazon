"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, MessageSquare, Phone, Package, RotateCcw, CreditCard, ShieldCheck } from "lucide-react";
import { useSession } from "./providers";

const topics = [
  { title: "Your orders", body: "Track, cancel or return a recent order.", href: "/orders", icon: Package },
  { title: "Shipping & delivery", body: "Rates, options and what affects delivery times.", href: "/shipping", icon: ChevronRight },
  { title: "Returns & refunds", body: "How to return an item and get a refund.", href: "/returns", icon: RotateCcw },
  { title: "Login & security", body: "Sign-in problems and account security.", href: "/account", icon: ShieldCheck },
  { title: "Payments", body: "Payment methods, points and gift cards.", href: "/points", icon: CreditCard },
];

export function HelpFlow() {
  const { user, ready } = useSession();
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return <div className="amz-static-page">
    <div className="amz-static">
      <nav className="amz-breadcrumb"><Link href="/">Home</Link><span> › </span><span>Customer Service</span></nav>
      <div className="amz-static-head"><h1>Customer Service</h1><p className="amz-static-sub">What can we help you find today?</p></div>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 16px" }}>Help topics</h2>
      <div className="amz-static-cards">
        {topics.map(t => <Link key={t.title} href={t.href} className="amz-static-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <h3>{t.title}</h3><p>{t.body}</p><span className="amz-static-cardlink">Get help</span>
        </Link>)}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "28px 0 12px" }}>Contact us</h2>
      {!ready ? <p className="muted">Loading your support options…</p> : !user ? <>
        <p style={{ maxWidth: "60ch" }}>To see the support options for your recent orders — including a call-back or chat — please sign in. You can also use the help topics above without an account.</p>
        <div className="amz-static-cta" style={{ marginTop: 16 }}>
          <Link href="/sign-in?next=%2Fhelp" className="amz-buy-btn amz-cta-btn">Sign in to get help with your orders</Link>
        </div>
      </> : sent ? <div className="amz-help-sent" role="status"><CheckCircle /> <div><strong>Message sent.</strong><p className="muted">A specialist will reply to {user.email}. Reference #CS-{Date.now().toString().slice(-6)}.</p></div></div> : <>
        <p style={{ maxWidth: "60ch", marginBottom: 16 }}>Hi {user.email?.split("@")[0] ?? "there"}, choose how you'd like to reach us. We'll follow up about your recent orders.</p>
        <div className="amz-help-methods">
          <div className="amz-help-method"><Phone size={20} /><div><strong>Request a call</strong><p className="muted">We'll ring you within 30 minutes.</p></div><button className="amz-help-btn" onClick={() => setSent(true)}>Call me</button></div>
          <div className="amz-help-method"><MessageSquare size={20} /><div><strong>Start a chat</strong><p className="muted">Average wait: 2 minutes.</p></div><button className="amz-help-btn" onClick={() => setSent(true)}>Chat now</button></div>
        </div>
        <form className="amz-help-form" onSubmit={e => { e.preventDefault(); if (subject && message) setSent(true); }}>
          <h3>Email us a message</h3>
          <div className="field"><label htmlFor="help-subject">What do you need help with?</label>
            <select id="help-subject" value={subject} onChange={e => setSubject(e.target.value)} required>
              <option value="">Choose a topic</option>
              <option>Problem with an order</option>
              <option>Returns &amp; refunds</option>
              <option>Payment or billing</option>
              <option>Account &amp; login</option>
              <option>Something else</option>
            </select>
          </div>
          <div className="field"><label htmlFor="help-message">Message</label>
            <textarea id="help-message" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue…" required />
          </div>
          <button type="submit" className="amz-buy-btn amz-cta-btn" disabled={!subject || !message}>Send message</button>
        </form>
      </>}
    </div>
  </div>;
}

function CheckCircle() { return <span className="amz-help-check" aria-hidden="true"><ShieldCheck size={26} /></span>; }
