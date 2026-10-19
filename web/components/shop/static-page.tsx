import Link from "next/link";
import { AuthAction } from "./auth-action";

export type Block =
  | { type: "lead"; text: string }
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "cards"; items: { title: string; body: string; cta?: { label: string; href: string } }[] }
  | { type: "steps"; items: { title: string; body: string }[] }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "cta"; label: string; href: string; note?: string; auth?: boolean };

export type StaticContent = {
  slug: string;
  title: string;
  subtitle?: string;
  crumbs: { label: string; href?: string }[];
  blocks: Block[];
  related?: { label: string; href: string }[];
};

export function StaticPage({ content }: { content: StaticContent }) {
  return <div className="amz-static-page">
    <div className="amz-static">
    <nav className="amz-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {content.crumbs.map((c, i) => <span key={i}> › {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}</span>)}
    </nav>
    <div className="amz-static-head">
      <h1>{content.title}</h1>
      {content.subtitle && <p className="amz-static-sub">{content.subtitle}</p>}
    </div>
    <div className="amz-static-body">
      <div className="amz-static-main">
        {content.blocks.map((b, i) => <BlockView key={i} block={b} />)}
      </div>
      {content.related && <aside className="amz-static-side">
        <h2>Explore</h2>
        <ul>{content.related.map((r, i) => <li key={i}><Link href={r.href}>{r.label}</Link></li>)}</ul>
      </aside>}
    </div>
    </div>
  </div>;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "lead": return <p className="amz-static-lead">{block.text}</p>;
    case "p": return <p>{block.text}</p>;
    case "h2": return <h2>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "bullets": return <ul className="amz-static-bullets">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "cards": return <div className="amz-static-cards">{block.items.map((c, i) => (
      <div className="amz-static-card" key={i}><h3>{c.title}</h3><p>{c.body}</p>{c.cta && <Link href={c.cta.href} className="amz-static-cardlink">{c.cta.label}</Link>}</div>
    ))}</div>;
    case "steps": return <ol className="amz-static-steps">{block.items.map((s, i) => (
      <li key={i}><span className="amz-static-stepnum">{i + 1}</span><div><strong>{s.title}</strong><p>{s.body}</p></div></li>
    ))}</ol>;
    case "table": return <div className="amz-static-tablewrap"><table><caption>{block.caption}</caption><thead><tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case "faq": return <div className="amz-static-faq">{block.items.map((f, i) => (
      <details key={i}><summary>{f.q}</summary><p>{f.a}</p></details>
    ))}</div>;
    case "cta": return <div className="amz-static-cta">{block.auth === false ? <Link href={block.href} className="amz-buy-btn amz-cta-btn">{block.label}</Link> : <AuthAction href={block.href} label={block.label} className="amz-buy-btn amz-cta-btn" />}{block.note && <span className="amz-static-ctanote">{block.note}</span>}</div>;
  }
}
